import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {Java, JavaAstUtils} from '@omnigen/target-java';

const logger = LoggerFactory.create(import.meta.url);

export class MethodToGetterTypeScriptAstTransformer implements AstTransformer<Java.JavaAstRootNode> {

  transformAst(args: AstTransformerArguments<Java.JavaAstRootNode, PackageOptions & TargetOptions>): void {

    const defaultReducer = args.root.createReducer();

    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceMethodDeclaration: (n, r) => {

        const getterFieldReference = JavaAstUtils.getGetterFieldReference(args.root, n);
        if (getterFieldReference !== undefined) {

          return new Java.FieldBackedGetter(
            new Java.JavaReference<Java.Field>(getterFieldReference.targetId),
            n.signature.annotations,
            n.signature.comments,
            undefined,
          );
        }

        return defaultReducer.reduceMethodDeclaration(n, r);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
