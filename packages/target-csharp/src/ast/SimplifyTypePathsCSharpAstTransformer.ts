import {AstTransformer, AstTransformerArguments, TargetOptions} from '@omnigen/core';
import {CSharpRootNode} from './CSharpRootNode.ts';
import {CSharpOptions} from '../options';
import {CSharpAstReducer} from './CSharpAstReducer.ts';


/**
 * Simplify type paths, such as making `System.String` into just `String`, and removing any `System.*` imports
 */
export class SimplifyTypePathsCSharpAstTransformer implements AstTransformer<CSharpRootNode, TargetOptions & CSharpOptions> {

  transformAst(args: AstTransformerArguments<CSharpRootNode, TargetOptions & CSharpOptions>): void {

    let importDepth = 0;
    const defaultReducer = args.root.createReducer();
    const reducer: CSharpAstReducer = {
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

        const importName = n.getImportName();
        if (importDepth > 0 && importName && (importName === 'System' || (importName.startsWith('System.') && importName.match(/System\.\w+/)))) {

          // Removed, since System.* is always automatically imported.
          return undefined;
        }

        const localName = n.getLocalName();
        if (localName && localName.match(/System\.\w+/)) {

          n.setLocalName(localName.substring('System.'.length));
          return n;
        }

        return n;
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }
}
