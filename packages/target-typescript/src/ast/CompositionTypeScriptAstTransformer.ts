import {AstTransformer, AstTransformerArguments, CompositionKind, OmniTypeKind, PackageOptions, TargetOptions} from '@omnigen/core';
import {TsRootNode} from './TsRootNode.ts';
import {DefaultTypeScriptVisitor} from '../visit';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil} from '@omnigen/core-util';
import {Ts, TsAstUtils} from '../ast';
import {Java, JavaUtil} from '@omnigen/target-java';
import {DefaultTypeScriptAstReducer} from './TypeScriptAstReducer.ts';

const logger = LoggerFactory.create(import.meta.url);

export class CompositionTypeScriptAstTransformer implements AstTransformer<TsRootNode> {

  transformAst(args: AstTransformerArguments<TsRootNode, PackageOptions & TargetOptions>): void {

    const typesToReplace = new Map<Java.TypeNode, Java.TypeNode>();
    const toRemove: number[] = [];

    args.root.visit({
      ...DefaultTypeScriptVisitor,

      visitCompositionType: (n, v) => {
        return n;
      },

      visitClassDeclaration: (n, v) => {

        if (n.type.omniType.kind != OmniTypeKind.COMPOSITION) {
          return DefaultTypeScriptVisitor.visitClassDeclaration(n, v);
        }

        const compositionKind = n.type.omniType.compositionKind;
        if (n.body.children.length > 0) {
          logger.warn(`There are children inside composition '${OmniUtil.describe(n.type.omniType)}' node -- will not be able to convert it into TypeScript composition type node`);
        } else if (compositionKind == CompositionKind.XOR || compositionKind == CompositionKind.OR || compositionKind == CompositionKind.AND) {

          if (n.name.implicit) {

            toRemove.push(n.id);

          } else {

            const ct = TsAstUtils.createTypeNode(n.type.omniType);

            // TODO: Add this to an existing suitable CompilationUnit instead? Make it an option to move it elsewhere? Maybe to where it is used the most?
            const typeAlias = new Ts.TypeAliasDeclaration(n.name, ct, new Java.ModifierList(new Java.Modifier(Java.ModifierType.PUBLIC)));
            args.root.children.push(new Java.CompilationUnit(
              new Java.PackageDeclaration(JavaUtil.getPackageName(n.type.omniType, n.name.value, args.options)),
              new Java.ImportList([]),
              typeAlias,
            ));

            // TODO: Should not replace type node with 'ct' -- should replace it with a reference to 'ct' -- Add new node which is a `NameOf` that points using the node id.
            // TODO: This is wrong... the thing we are pointing to needs to be a type -- something is fundamentally wrong here

            const identifierOf = new Java.IdentifierOf(typeAlias.id);

            typesToReplace.set(n.type, ct);
          }
        }

        return DefaultTypeScriptVisitor.visitClassDeclaration(n, v);
      },
    });

    const newRoot = args.root.reduce({
      ...DefaultTypeScriptAstReducer,
      reduceClassDeclaration: (node, reducer) => {

        if (toRemove.includes(node.id) || typesToReplace.get(node.type)) {
          return undefined;
        }

        return DefaultTypeScriptAstReducer.reduceClassDeclaration(node, reducer);
      },
      reduceCompilationUnit: (node, reducer) => {
        const result = DefaultTypeScriptAstReducer.reduceCompilationUnit(node, reducer);
        if (result && result.children.length == 0) {
          return undefined;
        }

        return result;
      },
      reduceEdgeType: (node, r) => {

        const replacementNode = typesToReplace.get(node);
        if (replacementNode) {
          return replacementNode;
        } else if (node.omniType.kind == OmniTypeKind.COMPOSITION) {

          return TsAstUtils.createTypeNode(node.omniType).reduce(r);
        }

        return node;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}

