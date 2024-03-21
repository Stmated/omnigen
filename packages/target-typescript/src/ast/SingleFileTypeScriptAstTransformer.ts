import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {Java, JavaReducer} from '@omnigen/target-java';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Perhaps rewrite this into a "FewerFiles" transformer, that keep "top" types as separate files
 */
export class SingleFileTypeScriptAstTransformer implements AstTransformer<Java.JavaAstRootNode> {

  transformAst(args: AstTransformerArguments<Java.JavaAstRootNode, PackageOptions & TargetOptions>): void {

    const defaultReducer = args.root.createReducer();

    let firstUnit: Java.CompilationUnit | undefined = undefined;

    const reducer: JavaReducer = {
      ...defaultReducer,
      reduceCompilationUnit: (n, r) => {

        if (firstUnit === undefined) {
          firstUnit = n;
          return n;
        } else {

          firstUnit.children.push(...n.children);
          firstUnit.imports.children.length = 0;
          return undefined;
        }
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }
}
