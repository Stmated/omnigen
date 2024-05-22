import {AstTransformer, AstTransformerArguments} from '@omnigen/core';
import {CodeRootAstNode} from '../CodeRootAstNode.ts';
import * as Code from '../CodeAst';

/**
 * Moving super-constructor call into the body of the constructor
 */
export class ToConstructorBodySuperCallAstTransformer implements AstTransformer<CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode>): void {

    const baseReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...baseReducer,

      reduceConstructor: (n, r) => {

        const reduced = baseReducer.reduceConstructor(n, r);

        if (reduced && reduced.superCall) {

          // The super-call needs to be moved to the constructor body :)
          const statement = new Code.Statement(reduced.superCall);
          if (reduced.body) {
            reduced.body.children.splice(0, 0, statement);
          } else {
            reduced.body = new Code.Block(statement);
          }

          reduced.superCall = undefined;
        }

        return reduced;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
