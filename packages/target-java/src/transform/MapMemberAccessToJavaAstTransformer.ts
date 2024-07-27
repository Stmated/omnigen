import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import * as Java from '../ast/JavaAst';
import {TokenKind} from '../ast/JavaAst';
import {CodeAstUtils} from '@omnigen/target-code';
import {OmniTypeKind} from '@omnigen/core';

/**
 * Will replace generic index access and assignment to index access for maps into map function calls.
 */
export class MapMemberAccessToJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const baseReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...baseReducer,

      reduceBinaryExpression: (n, r) => {

        const reduced = baseReducer.reduceBinaryExpression(n, r);
        if (reduced && reduced instanceof Java.BinaryExpression && reduced.token === TokenKind.ASSIGN && reduced.left instanceof Java.IndexAccess) {

          const omniType = CodeAstUtils.getOmniType(args.root, reduced.left.owner);
          if (omniType && omniType.kind === OmniTypeKind.DICTIONARY) {

            return new Java.MethodCall(
              new Java.MemberAccess(reduced.left.owner, new Java.Identifier('put')),
              new Java.ArgumentList(
                reduced.left.index,
                reduced.right,
              ),
            );
          }
        }

        return reduced;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
