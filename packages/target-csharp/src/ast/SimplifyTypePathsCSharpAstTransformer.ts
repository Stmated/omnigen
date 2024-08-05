import {AstTransformer, AstTransformerArguments, TargetOptions} from '@omnigen/api';
import {CSharpRootNode} from './CSharpRootNode.ts';
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

        // const importName = n.getImportName();
        // if (importDepth > 0 && importName && (importName === 'System' || (importName.startsWith('System.') && importName.match(/System\.\w+/)))) {
        //
        //   // Removed, since System.* is always automatically imported.
        //   return undefined;
        // }

        // const localName = n.getLocalName();
        // if (localName && localName.match(/System\.\w+/)) {
        //
        //   n.setLocalName(localName.substring('System.'.length));
        //   return n;
        // }

        return n;
      },
    });
    if (newRoot) {
      args.root = newRoot;
    }
  }
}
