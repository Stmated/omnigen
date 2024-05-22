import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer';
import {JavaReducer} from '../reduce';

/**
 * Simplify type paths, such as making `java.lang.String` into just `String`, and removing any `java.lang.xyz` imports
 */
export class SimplifyTypePathsJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    let importDepth = 0;
    const defaultReducer = args.root.createReducer();
    const reducer: JavaReducer = {
      ...defaultReducer,
      reduceImportList: (n, r) => {
        try {
          importDepth++;
          return defaultReducer.reduceImportList(n, r);
        } finally {
          importDepth--;
        }
      },

      reduceImportStatement: (n, r) => {
        return defaultReducer.reduceImportStatement(n, r);
      },

      reduceEdgeType: n => {

        const importName = n.getImportName();
        if (importDepth > 0 && importName && importName.startsWith('java.lang.') && importName.match(/java\.lang\.\w+/)) {

          // Removed, since java.lang.* is always automatically imported.
          return undefined;
        }

        const localName = n.getLocalName();
        if (localName && localName.match(/java\.lang\.\w+/)) {

          n.setLocalName(localName.substring('java.lang.'.length));
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
