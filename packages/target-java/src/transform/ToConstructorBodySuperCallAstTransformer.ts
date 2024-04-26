import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import * as Java from '../ast';

/**
 * Moving super-constructor call into the body of the constructor
 */
export class ToConstructorBodySuperCallAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const baseReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...baseReducer,

      reduceConstructor: (n, r) => {

        const reduced = baseReducer.reduceConstructor(n, r);

        if (reduced && reduced.superCall) {

          // The super-call needs to be moved to the constructor body :)
          const statement = new Java.Statement(reduced.superCall);
          if (reduced.body) {
            reduced.body.children.splice(0, 0, statement);
          } else {
            reduced.body = new Java.Block(statement);
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
