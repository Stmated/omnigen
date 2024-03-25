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
          const getterFieldId = JavaAstUtils.getGetterFieldId(args.root, n);
          if (getterFieldId !== undefined) {

            return new Java.FieldBackedGetter(
              new Java.FieldReference(getterFieldId),
              n.signature.annotations,
              n.signature.comments,
              undefined,
            );
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
