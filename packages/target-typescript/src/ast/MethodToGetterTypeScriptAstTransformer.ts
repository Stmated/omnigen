import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {Java, JavaAstUtils, JavaReducer} from '@omnigen/target-java';

const logger = LoggerFactory.create(import.meta.url);

export class MethodToGetterTypeScriptAstTransformer implements AstTransformer<Java.JavaAstRootNode> {

  transformAst(args: AstTransformerArguments<Java.JavaAstRootNode, PackageOptions & TargetOptions>): void {

    const defaultReducer = args.root.createReducer();

    const reducer: JavaReducer = {
      ...defaultReducer,
      reduceMethodDeclaration: (n, r) => {

        if (!(n instanceof Java.FieldBackedGetter)) {

          // TODO: "FieldBackedGetter" should not inherit from MethodDeclaration, it should be its own thing
          const getterField = JavaAstUtils.getGetterField(n);
          if (getterField) {

            const getter = new Java.FieldBackedGetter(
              getterField,
              n.signature.annotations,
              n.signature.comments,
              undefined,
            );

            getter.body = n.body;

            return getter;
          }
        }

        return defaultReducer.reduceMethodDeclaration(n, r);
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }
}
