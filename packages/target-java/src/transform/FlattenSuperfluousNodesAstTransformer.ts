import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import * as Java from '../ast';
import {JavaReducer} from '../reduce';

/**
 * Flattens any unnecessary nodes, to make the structure a bit simpler.
 */
export class FlattenSuperfluousNodesAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const defaultReducer = args.root.createReducer();
    const reducer: JavaReducer = {
      ...defaultReducer,
      ...{
        reduceBlock: (n, r) => {

          const children = [...n.children];
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child instanceof Java.Nodes) {
              children.splice(i, 1, ...child.children);
            }
          }

          return new Java.Block(...children);
        },
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }
}
