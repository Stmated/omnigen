import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments} from '@omnigen/api';
import * as Code from '../CodeAst';
import {CodeRootAstNode} from '../CodeRootAstNode';
import {CodeAstUtils} from '../CodeAstUtils';

const logger = LoggerFactory.create(import.meta.url);

export class MethodToGetterCodeAstTransformer implements AstTransformer<CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode>): void {

    const defaultReducer = args.root.createReducer();

    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceMethodDeclaration: (n, r) => {

        const getterFieldReference = CodeAstUtils.getGetterFieldReference(args.root, n);
        if (getterFieldReference !== undefined) {

          return new Code.FieldBackedGetter(
            new Code.FieldReference(getterFieldReference.targetId),
            n.signature.annotations,
            n.signature.comments,
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
