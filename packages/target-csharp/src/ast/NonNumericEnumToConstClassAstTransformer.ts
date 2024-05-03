import {LoggerFactory} from '@omnigen/core-log';
import {AstNode, AstTransformer, AstTransformerArguments, OmniEnumType, OmniPrimitiveType, OmniType, OmniTypeKind, PackageOptions, TargetOptions} from '@omnigen/core';
import {CSharpRootNode} from '../ast';
import {OmniUtil} from '@omnigen/core-util';
import {FreeTextUtils, Java} from '@omnigen/target-java';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Replaces any enum that has non-numeric item values with a class with static members, since languages like C# does not support non-numeric enums.
 *
 * TODO: Implement as alternative: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/enumeration-classes-over-enum-types
 */
export class NonNumericEnumToConstClassAstTransformer implements AstTransformer<CSharpRootNode> {

  transformAst(args: AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions>): void {

    const enumsToReplace: OmniEnumType[] = [];
    const enumToNode = new Map<OmniType, AstNode>();

    args.root.visit({
      ...args.root.createVisitor(),
      visitEnumDeclaration: n => {
        if (!OmniUtil.isNumericKind(n.type.omniType.itemKind)) {
          enumsToReplace.push(n.type.omniType);
        }
      },
    });

    const defaultReducer = args.root.createReducer();
    let newRoot = args.root.reduce({
      ...defaultReducer,
      reduceEnumDeclaration: (n, r) => {

        const t = n.omniType;
        if (enumsToReplace.includes(t)) {

          const newBlock = new Java.Block();

          for (const child of n.body.children) {

            if (child instanceof Java.EnumItemList) {

              for (const item of child.children) {

                const itemType: OmniPrimitiveType = {
                  kind: t.itemKind,
                  literal: true,
                  value: item.value.value,
                };

                const fieldTypeNode = args.root.getAstUtils().createTypeNode(itemType, false);
                const field = new Java.Field(
                  fieldTypeNode,
                  item.identifier,
                  new Java.ModifierList(
                    new Java.Modifier(Java.ModifierType.PUBLIC),
                    new Java.Modifier(Java.ModifierType.STATIC),
                    new Java.Modifier(Java.ModifierType.FINAL),
                  ),
                );

                field.initializer = item.value;

                newBlock.children.push(field);
              }
            }
          }

          const newClass = new Java.ClassDeclaration(
            n.type,
            n.name,
            newBlock,
            n.modifiers.reduce(r),
            n.genericParameterList,
          );

          if (!newClass.modifiers.children.some(it => it.type === Java.ModifierType.STATIC)) {
            newClass.modifiers.children.push(new Java.Modifier(Java.ModifierType.STATIC));
          }

          enumToNode.set(n.type.omniType, new Java.ClassName(n.type));

          newClass.comments = n.comments;
          newClass.annotations = n.annotations;

          // These will most likely break if there ever are any supertypes.
          newClass.extends = n.extends;
          newClass.implements = n.implements;

          return newClass;
        }

        return defaultReducer.reduceEnumDeclaration(n, r);
      },
    });

    if (!newRoot) {
      return undefined;
    }

    // 2 passes, since we need to have replaced the ENUMs first.
    newRoot = newRoot.reduce({
      ...defaultReducer,
      reduceField(n, r) {

        const reduced = defaultReducer.reduceField(n, r);

        if (reduced && reduced instanceof Java.Field) {

          const actualType = OmniUtil.getUnwrappedType(n.type.omniType);
          const node = enumToNode.get(actualType);

          if (node) {
            const newComment = new Java.FreeTextTypeLink(node);
            reduced.comments = new Java.Comment(FreeTextUtils.add(reduced.comments?.text, newComment), reduced.comments?.kind);
          }
        }

        return reduced;
      },
      reduceEdgeType(n, r) {

        // Likely not the best comparison since the omni type might be wrapped or transformed. But will do for now.
        const actualType = OmniUtil.getUnwrappedType(n.omniType);
        if (actualType.kind === OmniTypeKind.ENUM && enumsToReplace.some(it => it === actualType)) {

          const itemType: OmniPrimitiveType = {
            kind: actualType.itemKind,
          };

          OmniUtil.copyTypeMeta(n.omniType, itemType);

          return args.root.getAstUtils().createTypeNode(itemType);
        }

        return defaultReducer.reduceEdgeType(n, r);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
