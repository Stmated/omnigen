import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/api';
import {JavaOptions} from '../options';
import {Code} from '@omnigen/target-code';
import {CommentKind} from '@omnigen/target-code/ast';
import {JavaAstRootNode} from '../ast/JavaAstRootNode.ts';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Will replace a `const foo = SomeType` into what is suitable for Java. Which for now likely is to just remove it.
 *
 * The reason it is transformed here is because the initial Code AST is more abstract, and here we transform it into something more accurate.
 */
export class VarDecTypeJavaAstTransformer implements AstTransformer<JavaAstRootNode> {

  transformAst(args: AstTransformerArguments<JavaAstRootNode, PackageOptions & TargetOptions & JavaOptions>): void {

    const defaultReducer = args.root.createReducer();

    const newRoot = args.root.reduce({
      ...defaultReducer,

      reduceVariableDeclaration: n => {

        if (!n.initializer) {
          return n;
        }

        if (n.initializer instanceof Code.EdgeType || n.initializer instanceof Code.ArrayType || n.initializer instanceof Code.GenericType) {
          return new Code.Comment(`Removed type alias for '${n.identifier.value}' because of lack of Java support`, CommentKind.SINGLE);
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
