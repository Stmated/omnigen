import {JavaAndTargetOptions, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {AstTransformer, OmniHardcodedReferenceType, OmniType, OmniTypeKind} from '@omnigen/core';
import * as Java from '../ast/JavaAst';
import {OmniUtil, Visitor} from '@omnigen/core-util';
import {JACKSON_JSON_VALUE} from './JacksonJavaAstTransformer.ts';
import {JavaVisitor} from '../visit';
import {FieldAccessorMode, JavaOptions} from '../options';
import {CodeAstUtils} from '@omnigen/target-code';
import {ModifierKind} from '../ast/JavaAst';

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
export class AddLombokAstTransformer implements AstTransformer<Java.JavaAstRootNode, JavaAndTargetOptions> {
  transformAst(args: JavaAstTransformerArgs): void {

    if (!args.options.lombokBuilder && !args.options.lombokGetter && !args.options.lombokSetter && args.options.fieldAccessorMode !== FieldAccessorMode.LOMBOK) {
      return;
    }

    const cuStack: StackInfo[] = [];
    const nameResolver = args.root.getNameResolver();

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(Visitor.create(defaultVisitor, {

      visitMethodDeclaration: () => {
      },

      visitClassDeclaration: (n, v) => {
        this.visitObjectDec(n, cuStack, defaultVisitor, v, args.options);
      },

      visitEnumDeclaration: n => n,

      visitField: node => {

        const annotations = node.annotations || new Java.AnnotationList();
        const hasSingularJsonValue = annotations.children.find(it => {

          if (it instanceof Java.Annotation) {
            if (it.type.omniType.kind === OmniTypeKind.HARDCODED_REFERENCE) {
              // TODO: This is locked to Jackson, and needs to be abstracted somehow
              return nameResolver.isEqual(it.type.omniType.fqn, JACKSON_JSON_VALUE);
            }
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
            if (node.modifiers.children.find(it => it.kind === Java.ModifierKind.FINAL)) {
              // TODO: Remove the final modifier if all are final? lombok might complain but work anyway?
              info.finalFields++;
            } else {
              info.normalFields++;
            }

            info.fieldsToPrivatize.push(node);
          }
        }

        if (!hasSingularJsonValue && args.options.lombokBuilder) {

          if (!node.initializer) {

            if (!node.modifiers.children.some(it => it.kind !== ModifierKind.FINAL)) {
              // If there is no initializer already, then we need to add one.
              // This is because to be able to handle the @SuperBuilder and inheritance,
              // we need to be able to have a default constructor and fall back.
              // This is quite ugly, but is a quick way to get things working, and we can improve later.
              node.initializer = this.getDefaultValue(node.type.omniType);
            }
          } else {

            // We only add the @Default annotation if there is an initializer.
            annotations.children.push(new Java.Annotation(
              new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok', 'Builder'], edgeName: 'Default'}}),
            ));
          }
        }

        node.annotations = annotations;
      },
    }));

    if (args.options.lombokGetter || args.options.lombokSetter) {

      const defaultReducer = args.root.createReducer();
      const newRoot = args.root.reduce({
        ...defaultReducer,
        reduceFieldBackedGetter: (n, r) => {
          if (args.options.lombokGetter) {
            return undefined;
          } else {
            return defaultReducer.reduceFieldBackedGetter(n, r);
          }
        },
        reduceFieldBackedSetter: (n, r) => {
          if (args.options.lombokSetter) {
            return undefined;
          } else {
            return defaultReducer.reduceFieldBackedSetter(n, r);
          }
        },
      });

      if (newRoot) {
        args.root = newRoot;
      }
    }
  }

  private visitObjectDec(
    dec: Java.AbstractObjectDeclaration,
    infoStack: StackInfo[],
    defaultVisitor: JavaVisitor<unknown>,
    visitor: JavaVisitor<unknown>,
    options: JavaOptions,
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

    infoStack.push({
      cu: dec,
      finalFields: 0,
      normalFields: 0,
      skippingFactors: 0,
      fieldsToPrivatize: [],
    });
    defaultVisitor.visitObjectDeclaration(dec, visitor);
    const info = infoStack.pop();

    if (!info) {
      throw new Error(`Not an even number of pops on the info stack`);
    }

    if (info.skippingFactors > 0) {
      return;
    }

    const requiredArgsConstructorType: OmniHardcodedReferenceType = {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok'], edgeName: 'RequiredArgsConstructor'}};

    if (options.fieldAccessorMode === FieldAccessorMode.LOMBOK) {

      // TODO: This "field accessor mode" option should be split to different lombok options
      for (const field of info.fieldsToPrivatize) {
        // Filter away PRIVATE and FINAL
        field.modifiers.children = field.modifiers.children.filter(it => {
          return !(it.kind == Java.ModifierKind.PRIVATE || it.kind == Java.ModifierKind.FINAL);
        });
      }

      if (info.finalFields > 0 && info.normalFields == 0) {
        annotations.children.push(new Java.Annotation(
          new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok'], edgeName: 'Value'}}),
        ));
        if (options.immutable) {
          annotations.children.push(new Java.Annotation(
            new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok'], edgeName: 'With'}}),
          ));
        }
      } else {
        annotations.children.push(new Java.Annotation(
          new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok'], edgeName: 'Data'}}),
        ));
      }

      annotations.children.push(new Java.Annotation(
        new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok'], edgeName: 'AllArgsConstructor'}}),
        new Java.AnnotationKeyValuePairList(),
      ));
      annotations.children.push(new Java.Annotation(
        new Java.EdgeType(requiredArgsConstructorType),
        new Java.AnnotationKeyValuePairList(),
      ));
      annotations.children.push(new Java.Annotation(
        new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok'], edgeName: 'NoArgsConstructor'}}),
      ));
      annotations.children.push(new Java.Annotation(
        new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok', 'experimental'], edgeName: 'NonFinal'}}),
      ));

      if (dec.extends) {

        // If we extend from something, then we add to callSuper for Equals and HashCode.
        annotations.children.push(new Java.Annotation(
          new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok'], edgeName: 'EqualsAndHashCode'}}),
          new Java.AnnotationKeyValuePairList(
            new Java.AnnotationKeyValuePair(
              new Java.Identifier('callSuper'),
              new Java.Literal(true),
            ),
          ),
        ));
      }
    }

    if (options.lombokGetter) {
      annotations.children.push(new Java.Annotation(
        new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok'], edgeName: 'Getter'}}),
      ));
    }

    if (options.lombokSetter) {
      annotations.children.push(new Java.Annotation(
        new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok'], edgeName: 'Setter'}}),
      ));
    }

    if (options.lombokBuilder) {

      const superBuilderAnnotationArguments = new Java.AnnotationKeyValuePairList();

      if (options.immutable) {
        superBuilderAnnotationArguments.children.push(new Java.AnnotationKeyValuePair(
          new Java.Identifier('toBuilder'),
          new Java.Literal(true),
        ));
      }

      annotations.children.push(new Java.Annotation(
        new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok', 'experimental'], edgeName: 'SuperBuilder'}}),
        superBuilderAnnotationArguments,
      ));

      if (!dec.modifiers.children.some(it => it.kind === Java.ModifierKind.ABSTRACT)) {

        // Abstract classes with builders cannot be Jacksonized.
        annotations.children.push(new Java.Annotation(
          new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['lombok', 'extern', 'jackson'], edgeName: 'Jacksonized'}}),
        ));
      }

      if (!annotations.children.some(it => it instanceof Java.Annotation ? (it.type.omniType.fqn.edgeName === requiredArgsConstructorType.fqn.edgeName) : false)) {
        if (!dec.body.children.some(it => it instanceof Java.ConstructorDeclaration)) {
          annotations.children.push(new Java.Annotation(
            new Java.EdgeType(requiredArgsConstructorType),
            new Java.AnnotationKeyValuePairList(),
          ));
        }
      }
    }
  }

  private getDefaultValue(type: OmniType): Java.Literal {

    type = OmniUtil.getUnwrappedType(type);

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
