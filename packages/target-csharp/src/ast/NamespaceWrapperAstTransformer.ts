import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments} from '@omnigen/api';
import {CSharpRootNode} from '../ast';
import {Code} from '@omnigen/target-code';
import {assertDefined} from '@omnigen/core';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Takes all compilation units' content and places it inside a namespace declaration inside the respective unit.
 */
export class NamespaceWrapperAstTransformer implements AstTransformer<CSharpRootNode> {

  transformAst(args: AstTransformerArguments<CSharpRootNode>): void {

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceCompilationUnit: (n, r) => {

        const namespaceBlock = new Code.NamespaceBlock(new Code.Block(...n.children));
        const namespaceIdentifier = new Code.Identifier(n.packageDeclaration.fqn);
        const namespace = new Code.Namespace(namespaceIdentifier, namespaceBlock);

        const unit = new Code.CompilationUnit(
          assertDefined(n.packageDeclaration.reduce(r)),
          assertDefined(n.imports.reduce(r)),
          namespace,
        ).withIdFrom(n);

        unit.comments = n.comments?.reduce(r);

        return unit;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
