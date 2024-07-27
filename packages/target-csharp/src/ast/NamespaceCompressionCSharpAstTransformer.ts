import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {Code} from '@omnigen/target-code';
import {CSharpRootNode} from '../ast';
import {CSharpOptions} from '../options';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Places all files that are of the same namespace into one namespace, usually effectively creating a single file output
 */
export class NamespaceCompressionCSharpAstTransformer implements AstTransformer<CSharpRootNode> {

  transformAst(args: AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions & CSharpOptions>): void {

    if (!args.options.singleFile) {

      // Single file not enabled. Might be a bad name for the option, since we can get multiple files. Should be called a desire to compress number of files to less.
      return;
    }

    const namespaceNameToMainId = new Map<string, Code.Namespace>();
    const namespaceRedirect = new Map<Code.Namespace, Code.Namespace>();

    const defaultVisitor = args.root.createVisitor();
    args.root.visit({
      ...defaultVisitor,
      visitNamespace: n => {

        const namespaceName = n.name.value;
        let targetNamespace = namespaceNameToMainId.get(namespaceName);
        if (!targetNamespace) {
          targetNamespace = n;
          namespaceNameToMainId.set(namespaceName, targetNamespace);
        }

        namespaceRedirect.set(n, targetNamespace);
      },
    });

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceNamespace: n => {

        const targetNamespace = namespaceRedirect.get(n);
        if (targetNamespace === undefined) {
          throw new Error(`All namespaces should have been discovered in the earlier stage`);
        }

        if (targetNamespace !== n) {

          targetNamespace.block.block.children.push(...n.block.block.children);

          return undefined;

        } else {

          // We will keep this namespace as it is.
          return n;
        }
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
