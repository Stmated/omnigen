import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {Java} from '@omnigen/target-java';
import {CSharpRootNode} from '../ast';
import {assertDefined} from '@omnigen/core-util';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Replaces any fields with properties with a proper getter/setter
 */
export class NamespaceWrapperAstTransformer implements AstTransformer<CSharpRootNode> {

  transformAst(args: AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions>): void {

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceCompilationUnit: (n, r) => {

        const namespaceBlock = new Java.NamespaceBlock(new Java.Block(...n.children));
        const namespaceIdentifier = new Java.Identifier(n.packageDeclaration.fqn);
        const namespace = new Java.Namespace(namespaceIdentifier, namespaceBlock);

        return new Java.CompilationUnit(
          assertDefined(n.packageDeclaration.reduce(r)),
          assertDefined(n.imports.reduce(r)),
          namespace,
        ).withIdFrom(n);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
