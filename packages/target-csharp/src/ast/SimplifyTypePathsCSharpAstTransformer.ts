import {AstTransformer, AstTransformerArguments, TargetOptions} from '@omnigen/api';
import {CSharpRootNode} from './CSharpRootNode';
import {CSharpOptions} from '../options';

/**
 * Simplify type paths, such as making `System.String` into just `String`, and removing any `System.*` imports
 */
export class SimplifyTypePathsCSharpAstTransformer implements AstTransformer<CSharpRootNode, TargetOptions & CSharpOptions> {

  transformAst(args: AstTransformerArguments<CSharpRootNode, TargetOptions & CSharpOptions>): void {

    let importDepth = 0;
    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceImportList: (n, r) => {
        try {
          importDepth++;
          return defaultReducer.reduceImportList(n, r);
        } finally {
          importDepth--;
        }
      },

      reduceEdgeType: n => {
        return n;
      },
    });
    if (newRoot) {
      args.root = newRoot;
    }
  }
}
