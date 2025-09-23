import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, OmniTypeKind, PackageOptions, TargetOptions} from '@omnigen/api';
import {CSharpOptions} from '../options';
import {CSharpRootNode, Cs} from '../ast';
import {Code} from '@omnigen/target-code';
import {ModifierKind} from '@omnigen/target-code/ast';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Will replace a regular `const foo = SomeType` into a C# `using Foo = SomeType`.
 *
 * The reason it is transformed here is because the initial Code AST is more abstract, and here we transform it into something more accurate..
 */
export class VarDecToTypeAliasCSharpAstTransformer implements AstTransformer<CSharpRootNode> {

  transformAst(args: AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions & CSharpOptions>): void {

    const defaultReducer = args.root.createReducer();

    const newImports: Code.ImportStatement[][] = [];

    const newRoot = args.root.reduce({
      ...defaultReducer,

      reduceCompilationUnit: (n, r) => {

        try {
          const importStatements: Code.ImportStatement[] = [];
          newImports.push(importStatements);

          const cu = defaultReducer.reduceCompilationUnit(n, r);

          if (cu && newImports.length > 0) {

            if (!cu.imports) {
              cu.imports = new Code.ImportList();
            }

            cu.imports.children.push(...importStatements);
          }

          return cu;

        } finally {
          newImports.pop();
        }
      },

      reduceVariableDeclaration: n => {

        if (!n.initializer) {
          return n;
        }

        if (n.initializer instanceof Code.EdgeType || n.initializer instanceof Code.ArrayType || n.initializer instanceof Code.GenericType) {

          // TODO: This is wrong, and this is just a placeholder for now
          newImports.push(new Code.ImportStatement(new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: `using ${n.identifier.value} = ${n.initializer}`})));
          return undefined;
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
