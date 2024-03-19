import {AstTransformer, AstTransformerArguments, CompositionKind, OmniTypeKind, PackageOptions, TargetOptions} from '@omnigen/core';
import {TsRootNode} from './TsRootNode.ts';
import {DefaultTypeScriptVisitor} from '../visit';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil} from '@omnigen/core-util';
import {Ts, TsAstUtils} from '../ast';
import {Java, JavaUtil} from '@omnigen/target-java';
import {DefaultTypeScriptAstReducer, TypeScriptAstReducer} from './TypeScriptAstReducer.ts';

const logger = LoggerFactory.create(import.meta.url);

export class CompositionTypeScriptAstTransformer implements AstTransformer<TsRootNode> {

  transformAst(args: AstTransformerArguments<TsRootNode, PackageOptions & TargetOptions>): void {

    const typesToReplace = new Map<Java.TypeNode, Java.TypeNode>();

    args.root.visit({
      ...DefaultTypeScriptVisitor,

      visitClassDeclaration: (n, v) => {

        if (n.type.omniType.kind == OmniTypeKind.COMPOSITION) {

          if (n.body.children.length > 0) {
            logger.warn(`There are children inside composition '${OmniUtil.describe(n.type.omniType)}' node -- will not be able to convert it into TypeScript composition type node`);
          } else if (n.type.omniType.compositionKind == CompositionKind.XOR || n.type.omniType.compositionKind == CompositionKind.AND) {

            const ct = new Ts.CompositionType(
              n.type.omniType,
              n.type.omniType.types.map(it => TsAstUtils.createTypeNode(it)),
            );

            typesToReplace.set(n.type, ct);
            // TODO: Add this to an existing suitable CompilationUnit instead? Make it an option to move it elsewhere? Maybe to where it is used the most?
            args.root.children.push(new Java.CompilationUnit(
              new Java.PackageDeclaration(JavaUtil.getPackageName(n.type.omniType, n.name.value, args.options)),
              new Java.ImportList([]),
              new Ts.TypeAliasDeclaration(n.name, ct),
            ));

            // return undefined;
          }
        }

        return DefaultTypeScriptVisitor.visitClassDeclaration(n, v);
      },
    });

    // TODO: Replace all mentions of the old type with this TypeScript composition type
    //        Need to implement a standardized way of doing tree-folding where we can replace nodes easily (like inside visitType)

    const i = 0;

    const reducer: TypeScriptAstReducer = {
      ...DefaultTypeScriptAstReducer,
      reduceClassDeclaration: (node, reducer) => {

        const replacementNode = typesToReplace.get(node.type);
        if (replacementNode) {
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
      reduceRegularType: node => {

        const replacementNode = typesToReplace.get(node);
        if (replacementNode) {
          return replacementNode;
        }

        return node;
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }
}

