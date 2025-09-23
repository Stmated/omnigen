import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/api';
import {TypeScriptOptions} from '../options';
import {Ts} from '../ast';
import {Code} from '@omnigen/target-code';
import {ModifierKind} from '@omnigen/target-code/ast';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Will replace a regular `const foo = SomeType` into a TypeScript `type Foo = SomeType`.
 *
 * The reason it is transformed here is because the initial Code AST is more abstract, and here we transform it into something more accurate..
 */
export class VarDecToTypeAliasTypeScriptAstTransformer implements AstTransformer<Ts.TsRootNode> {

  transformAst(args: AstTransformerArguments<Ts.TsRootNode, PackageOptions & TargetOptions & TypeScriptOptions>): void {

    const defaultReducer = args.root.createReducer();

    const newRoot = args.root.reduce({
      ...defaultReducer,

      reduceVariableDeclaration: n => {

        if (!n.initializer) {
          return n;
        }

        if (n.initializer instanceof Code.EdgeType || n.initializer instanceof Code.ArrayType || n.initializer instanceof Code.GenericType) {
          // TODO: Copy modifiers from variable declaration once they are added
          return new Ts.TypeAliasDeclaration(n.identifier, n.initializer, new Code.ModifierList(new Code.Modifier(ModifierKind.PUBLIC))).withIdFrom(n);
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
