import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, OmniIntersectionType, OmniType, OmniTypeKind, TypeNode, UnknownKind} from '@omnigen/api';
import {Ts} from '.';
import {OmniUtil} from '@omnigen/core';

const logger = LoggerFactory.create(import.meta.url);

export class InterfaceToTypeAliasTypeScriptAstTransformer implements AstTransformer<Ts.TsRootNode> {

  transformAst(args: AstTransformerArguments<Ts.TsRootNode>): void {

    const defaultReducer = args.root.createReducer();

    const newRoot = args.root.reduce({
      ...defaultReducer,

      reduceInterfaceDeclaration: (n, r) => {

        if (n.body.children.length == 0) {

          if (n.extends) {
            if (n.extends.types.children.length == 1) {

              const originalTypeNode = n.extends.types.children[0];
              const originalType = originalTypeNode.omniType;
              const inlinedTypeNode = this.getInlinedIfNeededTypeNode(originalType, originalTypeNode, args);

              return new Ts.Statement(new Ts.TypeAliasDeclaration(n.name, inlinedTypeNode, n.modifiers).withIdFrom(originalTypeNode));
            }
          } else if (!n.implements) {

            const anyTypeNode = args.root.getAstUtils().createTypeNode({kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.OBJECT});
            return new Ts.Statement(new Ts.TypeAliasDeclaration(n.name, anyTypeNode, n.modifiers));
          }
        } else {

          if (n.extends && n.extends.types.children.length === 1) {

            const superType = n.extends.types.children[0];
            if (OmniUtil.isComposition(superType.omniType) || (superType.omniType.kind === OmniTypeKind.INTERFACE && OmniUtil.isComposition(superType.omniType.of))) {

              // The extension is a composition, and our interface has members.
              // TypeScript can only represent this as a type alias (or if all members of the composition are statically known).
              // So we will convert this into a type alias of proper form instead.

              // TODO: This might be better if moved to a 2nd pass Model Transformer which creates the inline type(s) and intersection.

              const joinedCompositionType: OmniIntersectionType = {
                kind: OmniTypeKind.INTERSECTION,
                inline: true,
                types: [
                  n.omniType,
                  superType.omniType,
                ],
                debug: OmniUtil.addDebug(superType.omniType.debug, 'Composition type to inline type alias'),
              };

              n.body.enclosed = true;
              n.body.compact = true;

              const newTypeNode = new Ts.CompositionType(joinedCompositionType, [n.body, superType]);

              return new Ts.Statement(new Ts.TypeAliasDeclaration(n.name, newTypeNode, n.modifiers));
            }
          }
        }

        return defaultReducer.reduceInterfaceDeclaration(n, r);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  private getInlinedIfNeededTypeNode(originalType: OmniType, originalTypeNode: TypeNode, args: AstTransformerArguments<Ts.TsRootNode>): TypeNode {

    if (originalType.inline) {
      return originalTypeNode;
    } else {

      const inlined = this.getInlinedIfNeededType(originalType);
      return args.root.getAstUtils().createTypeNode(inlined);
    }
  }

  private getInlinedIfNeededType(type: OmniType) {
    return type.inline ? type : {...type, inline: true, debug: OmniUtil.addDebug(type.debug, 'Type made inline for Interface -> Alias conversion')} satisfies typeof type;
  }
}
