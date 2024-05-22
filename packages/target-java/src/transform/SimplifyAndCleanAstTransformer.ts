import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import * as Java from '../ast/JavaAst';
import {JavaReducer} from '../reduce';

/**
 * Flattens any unnecessary nodes, to make the structure a bit simpler.
 */
export class SimplifyAndCleanAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const defaultReducer = args.root.createReducer();
    const reducer: JavaReducer = {
      ...defaultReducer,
      reduceBlock: (n, r) => {

        const children = [...n.children];
        for (let i = 0; i < children.length; i++) {
          const child = children[i].reduce(r);
          if (!child) {
            children.splice(i, 1);
          } else if (child instanceof Java.Nodes) {
            children.splice(i, 1, ...child.children);
          } else {
            children[i] = child;
          }
        }

        return new Java.Block(...children);
      },
      reduceGeneralAnnotationNode: () => {
        return undefined;
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }
}
