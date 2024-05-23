import {AstTransformer, AstTransformerArguments} from '@omnigen/core';
import * as Code from '../Code';

/**
 * Flattens any unnecessary nodes, to make the structure a bit simpler.
 */
export class SimplifyAndCleanAstTransformer implements AstTransformer<Code.CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<Code.CodeRootAstNode>): void {

    const newRoot = args.root.reduce({
      ...args.root.createReducer(),
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
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
