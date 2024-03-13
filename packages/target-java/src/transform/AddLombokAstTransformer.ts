import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {
  OmniPrimitiveKind,
  OmniType,
  OmniTypeKind,
} from '@omnigen/core';
import * as Java from '../ast';
import {AnnotationList, ModifierType} from '../ast';
import {VisitorFactoryManager} from '@omnigen/core-util';
import {JACKSON_JSON_VALUE} from './JacksonJavaAstTransformer.ts';

export interface StackInfo {
  cu: Java.CompilationUnit;
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
    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitMethodDeclaration: () => {},

      visitCompilationUnit: (node, visitor) => {

        if (node.object instanceof Java.EnumDeclaration) {

          // We do not add getters/setters for enums.
          return;
        }

        let annotations: AnnotationList;
        if (node.object.annotations) {
          annotations = node.object.annotations;
        } else {
          annotations = new AnnotationList(...[]);
          node.object.annotations = annotations;
        }

        cuStack.push({
          cu: node,
          finalFields: 0,
          normalFields: 0,
          skippingFactors: 0,
          fieldsToPrivatize: [],
        });
        AbstractJavaAstTransformer.JAVA_VISITOR.visitCompilationUnit(node, visitor);
        const info = cuStack.pop();

        if (info) {

          if (info.skippingFactors > 0) {
            return;
          }

          for (const field of info.fieldsToPrivatize) {
            // Filter away PRIVATE and FINAL
            field.modifiers.children = field.modifiers.children.filter(it => {
              return !(it.type == ModifierType.PRIVATE || it.type == ModifierType.FINAL);
            });
          }

          if (info.finalFields > 0 && info.normalFields == 0) {
            annotations.children.push(new Java.Annotation(
              new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.Value'}),
            ));
            annotations.children.push(new Java.Annotation(
              new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.With'}),
            ));
          } else {
            annotations.children.push(new Java.Annotation(
              new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.Data'}),
            ));
          }

          annotations.children.push(new Java.Annotation(
            new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.AllArgsConstructor'}),
            new Java.AnnotationKeyValuePairList(
              new Java.AnnotationKeyValuePair(
                new Java.Identifier('access'),
                new Java.Literal(true),
              ),
            ),
          ));

          annotations.children.push(new Java.Annotation(
            new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.RequiredArgsConstructor'}),
            new Java.AnnotationKeyValuePairList(
              new Java.AnnotationKeyValuePair(
                new Java.Identifier('access'),
                new Java.Literal(true),
              ),
            ),
          ));

          annotations.children.push(new Java.Annotation(
            new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.NoArgsConstructor'}),
          ));

          annotations.children.push(new Java.Annotation(
            new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.experimental.NonFinal'}),
          ));

          annotations.children.push(new Java.Annotation(
            new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.experimental.SuperBuilder'}),
            new Java.AnnotationKeyValuePairList(
              new Java.AnnotationKeyValuePair(
                new Java.Identifier('toBuilder'),
                new Java.Literal(true),
              ),
            ),
          ));

          annotations.children.push(new Java.Annotation(
            new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.extern.jackson.Jacksonized'}),
          ));

          if (node.object.extends) {

            // If we extend from something, then we add to callSuper for Equald and HashCode.
            annotations.children.push(new Java.Annotation(
              new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.EqualsAndHashCode'}),
              new Java.AnnotationKeyValuePairList(
                new Java.AnnotationKeyValuePair(
                  new Java.Identifier('callSuper'),
                  new Java.Literal(true),
                ),
              ),
            ));
          }
        }
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
            if (node.modifiers.children.find(it => it.type == ModifierType.FINAL)) {
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
            new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'lombok.Default'}),
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

  private getDefaultValue(type: OmniType): Java.Literal {

    switch (type.kind) {
      case OmniTypeKind.PRIMITIVE:
        switch (type.primitiveKind) {
          case OmniPrimitiveKind.INTEGER:
          case OmniPrimitiveKind.INTEGER_SMALL:
          case OmniPrimitiveKind.DOUBLE:
          case OmniPrimitiveKind.NUMBER:
          case OmniPrimitiveKind.LONG:
          case OmniPrimitiveKind.DECIMAL:
          case OmniPrimitiveKind.FLOAT:
            return new Java.Literal(0, type.primitiveKind);
          case OmniPrimitiveKind.BOOL:
            return new Java.Literal(false, type.primitiveKind);
          case OmniPrimitiveKind.CHAR:
            return new Java.Literal('', type.primitiveKind);
        }
        break;
    }


    return new Java.Literal(null);
  }
}
