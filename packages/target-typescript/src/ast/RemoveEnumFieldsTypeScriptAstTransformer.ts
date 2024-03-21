import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {Java, JavaReducer} from '@omnigen/target-java';

const logger = LoggerFactory.create(import.meta.url);

export class RemoveEnumFieldsTypeScriptAstTransformer implements AstTransformer<Java.JavaAstRootNode> {

  transformAst(args: AstTransformerArguments<Java.JavaAstRootNode, PackageOptions & TargetOptions>): void {

    const defaultReducer = args.root.createReducer();

    const reducer: JavaReducer = {
      ...defaultReducer,
      reduceEnumDeclaration: (n, r) => {

        n.body.children = n.body.children.filter(it => it instanceof Java.EnumItemList);
        if (n.body.children.length == 0) {
          return undefined;
        }

        return n;
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }
}
