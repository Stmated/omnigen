import {AstTransformer, AstTransformerArguments} from '@omnigen/core';
import * as Code from '../Code';

/**
 * Flattens any unnecessary nodes, to make the structure a bit simpler.
 */
export class SimplifyAndCleanAstTransformer implements AstTransformer<Code.CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<Code.CodeRootAstNode>): void {

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceBlock: (n, r) => {

        const children = [...n.children];
        for (let i = 0; i < children.length; i++) {
          const child = children[i].reduce(r);
          if (!child) {
            children.splice(i, 1);
          } else if (child instanceof Code.Nodes) {
            children.splice(i, 1, ...child.children);
          } else {
            children[i] = child;
          }
        }

        return new Code.Block(...children);
      },
      reduceVirtualAnnotationNode: () => {
        return undefined;
      },
      reduceConstructor: (n, r) => {

        const reduced = defaultReducer.reduceConstructor(n, r);

        if (reduced && (!reduced.parameters || reduced.parameters.children.length == 0) && !reduced.superCall && (!reduced.body || reduced.body.children.length == 0)) {
          return undefined;
        }

        return reduced;
      },
      reduceSuperConstructorCall: n => {

        if (n.arguments.children.length == 0) {
          return undefined;
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
