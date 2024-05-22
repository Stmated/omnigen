import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {
  OmniType,
  OmniTypeKind,
} from '@omnigen/core';
import * as Java from '../ast/JavaAst';
import {VisitorFactoryManager} from '@omnigen/core-util';
import {JACKSON_JSON_VALUE} from './JacksonJavaAstTransformer.ts';
import {JavaVisitor} from '../visit';

export interface StackInfo {
  cu: Java.AbstractObjectDeclaration;
  finalFields: number;
  normalFields: number;
  skippingFactors: number;
  fieldsToPrivatize: Java.Field[];
}

/**
 * Lombok support is currently pretty bad; especially for the more advanced examples of structures.
 * This will be improved as we move along, and right now it is enough to work for 80% of cases, in an ugly way.
 */
export class AddLombokAstTransformer extends AbstractJavaAstTransformer {
  transformAst(args: JavaAstTransformerArgs): void {

    const cuStack: StackInfo[] = [];

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitMethodDeclaration: () => {},

      visitObjectDeclaration: (node, visitor) => {
        this.visitObjectDec(node, cuStack, defaultVisitor, visitor);
      },

      visitField: node => {

        const annotations = node.annotations || new Java.AnnotationList();
        const hasSingularJsonValue = annotations.children.find(it => {

          if (it.type.omniType.kind == OmniTypeKind.HARDCODED_REFERENCE) {
            // TODO: This is locked to Jackson, and needs to be abstracted somehow
            return it.type.omniType.fqn == JACKSON_JSON_VALUE;
          }

          return false;
        });

        if (cuStack.length > 0) {

          const info = cuStack[cuStack.length - 1];
          if (info.skippingFactors > 0) {
            // There are factors that make us unable to apply lombok here.
            return;
          }

          if (hasSingularJsonValue) {
            info.skippingFactors++;
            return;
          }

          if (info) {
            if (node.modifiers.children.find(it => it.type == Java.ModifierType.FINAL)) {
              // TODO: Remove the final modifier if all are final? lombok might complain but work anyway?
              info.finalFields++;
            } else {
              info.normalFields++;
            }

            info.fieldsToPrivatize.push(node);
          }
        }

        if (!hasSingularJsonValue) {

          annotations.children.push(new Java.Annotation(
            new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.Default'}),
          ));

          if (!node.initializer) {

            // If there is no initializer already, then we need to add one.
            // This is because to be able to handle the @SuperBuilder and inheritance,
            // we need to be able to have a default constructor and fall back.
            // This is quite ugly, but is a quick way to get things working, and we can improve stuff later.

            node.initializer = this.getDefaultValue(node.type.omniType);
          }
        }

        node.annotations = annotations;
      },
    }));
  }

  private visitObjectDec(
    // cu: Java.CompilationUnit,
    dec: Java.AbstractObjectDeclaration,
    stack: StackInfo[],
    defaultVisitor: JavaVisitor<unknown>,
    visitor: JavaVisitor<unknown>,
  ): void {

    if (dec instanceof Java.EnumDeclaration) {

      // We do not add getters/setters for enums.
      return;
    }

    let annotations: Java.AnnotationList;
    if (dec.annotations) {
      annotations = dec.annotations;
    } else {
      annotations = new Java.AnnotationList(...[]);
      dec.annotations = annotations;
    }

    stack.push({
      cu: dec,
      finalFields: 0,
      normalFields: 0,
      skippingFactors: 0,
      fieldsToPrivatize: [],
    });
    defaultVisitor.visitObjectDeclaration(dec, visitor);
    const info = stack.pop();

    if (!info) {
      return;
    }

    if (info.skippingFactors > 0) {
      return;
    }

    for (const field of info.fieldsToPrivatize) {
      // Filter away PRIVATE and FINAL
      field.modifiers.children = field.modifiers.children.filter(it => {
        return !(it.type == Java.ModifierType.PRIVATE || it.type == Java.ModifierType.FINAL);
      });
    }

    if (info.finalFields > 0 && info.normalFields == 0) {
      annotations.children.push(new Java.Annotation(
        new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.Value'}),
      ));
      annotations.children.push(new Java.Annotation(
        new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.With'}),
      ));
    } else {
      annotations.children.push(new Java.Annotation(
        new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.Data'}),
      ));
    }

    annotations.children.push(new Java.Annotation(
      new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.AllArgsConstructor'}),
      new Java.AnnotationKeyValuePairList(
        new Java.AnnotationKeyValuePair(
          new Java.Identifier('access'),
          new Java.Literal(true),
        ),
      ),
    ));
    annotations.children.push(new Java.Annotation(
      new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.RequiredArgsConstructor'}),
      new Java.AnnotationKeyValuePairList(
        new Java.AnnotationKeyValuePair(
          new Java.Identifier('access'),
          new Java.Literal(true),
        ),
      ),
    ));
    annotations.children.push(new Java.Annotation(
      new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.NoArgsConstructor'}),
    ));
    annotations.children.push(new Java.Annotation(
      new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.experimental.NonFinal'}),
    ));
    annotations.children.push(new Java.Annotation(
      new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.experimental.SuperBuilder'}),
      new Java.AnnotationKeyValuePairList(
        new Java.AnnotationKeyValuePair(
          new Java.Identifier('toBuilder'),
          new Java.Literal(true),
        ),
      ),
    ));
    annotations.children.push(new Java.Annotation(
      new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.extern.jackson.Jacksonized'}),
    ));

    if (dec.extends) {

      // If we extend from something, then we add to callSuper for Equald and HashCode.
      annotations.children.push(new Java.Annotation(
        new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.EqualsAndHashCode'}),
        new Java.AnnotationKeyValuePairList(
          new Java.AnnotationKeyValuePair(
            new Java.Identifier('callSuper'),
            new Java.Literal(true),
          ),
        ),
      ));
    }
  }

  private getDefaultValue(type: OmniType): Java.Literal {

    switch (type.kind) {
      case OmniTypeKind.INTEGER:
      case OmniTypeKind.INTEGER_SMALL:
      case OmniTypeKind.DOUBLE:
      case OmniTypeKind.NUMBER:
      case OmniTypeKind.LONG:
      case OmniTypeKind.DECIMAL:
      case OmniTypeKind.FLOAT:
        return new Java.Literal(0, type.kind);
      case OmniTypeKind.BOOL:
        return new Java.Literal(false, type.kind);
      case OmniTypeKind.CHAR:
        return new Java.Literal('', type.kind);
    }


    return new Java.Literal(null);
  }
}
