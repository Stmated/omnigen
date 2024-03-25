import {AstTransformer, AstTransformerArguments, OmniType, OmniTypeKind, PackageOptions, TargetOptions} from '@omnigen/core';
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

    args.root.visit({
      ...DefaultTypeScriptVisitor,
      visitClassDeclaration: (n, v) => {

        if (!OmniUtil.isComposition(n.type.omniType)) {
          return DefaultTypeScriptVisitor.visitClassDeclaration(n, v);
        }

        if (n.body.children.length > 0) {
          logger.warn(`There are children inside composition '${OmniUtil.describe(n.type.omniType)}' node -- will not be able to convert it into TypeScript composition type node`);
        } else if (!n.type.omniType.inline) {

          const inlinedType: OmniType = {
            ...n.type.omniType,
            inline: true,
          };
          const aliasRhsTypeNode = TsAstUtils.createTypeNode(inlinedType);
          const replacementAliasTargetNode = new Java.EdgeType(n.type.omniType, false);

          // TODO: Add this to an existing suitable CompilationUnit instead? Make it an option to move it elsewhere? Maybe to where it is used the most?
          const typeAlias = new Ts.TypeAliasDeclaration(n.name, aliasRhsTypeNode, new Java.ModifierList(new Java.Modifier(Java.ModifierType.PUBLIC)));
          args.root.children.push(new Java.CompilationUnit(
            new Java.PackageDeclaration(JavaUtil.getPackageName(n.type.omniType, n.name.value, args.options)),
            new Java.ImportList([]),
            typeAlias,
          ));

          typesToReplace.set(n.type, replacementAliasTargetNode);
        }

        return DefaultTypeScriptVisitor.visitClassDeclaration(n, v);
      },
    });

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceClassDeclaration: (node, reducer) => {

        if (node.type.omniType.inline) {
          return undefined;
        }

        if (typesToReplace.get(node.type)) {
          return undefined;
        }

        return defaultReducer.reduceClassDeclaration(node, reducer);
      },
      reduceCompilationUnit: (node, reducer) => {
        const result = defaultReducer.reduceCompilationUnit(node, reducer);
        if (result && result.children.length == 0) {
          return undefined;
        }

        return result;
      },
      reduceEdgeType: (node, r) => {

        const replacementNode = typesToReplace.get(node);
        if (replacementNode) {
          return replacementNode;
        } else if (OmniUtil.isComposition(node.omniType)) {
          return TsAstUtils.createTypeNode(node.omniType);
        }

        return node;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}

