import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer';
import {JavaReducer} from '../reduce';
import {AstNode, TypeNode} from '@omnigen/api';
import * as Code from '@omnigen/target-code/ast';

/**
 * Simplify Java generics, such as making the RHS of an assignment's generics into short-hand diamond generics, such as: `Map<String, Object> map = new HashMap<>()`
 */
export class SimplifyGenericsJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const defaultReducer = args.root.createReducer();
    const reducer: JavaReducer = {
      ...defaultReducer,
      reduceField: (n, r) => {

        const reduced = defaultReducer.reduceField(n, r);
        if (reduced && reduced instanceof Code.Field && reduced.initializer) {

          const simplerInitializer = this.reduceRhsGenericToDiamond(reduced.type, reduced.initializer);
          if (simplerInitializer) {
            reduced.initializer = simplerInitializer;
          }
        }

        return reduced;
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }

  private reduceRhsGenericToDiamond(left: TypeNode, rightNode: AstNode): AstNode | undefined {

    if (left instanceof Code.GenericType && rightNode instanceof Code.NewStatement && rightNode.type instanceof Code.GenericType) {
      const right = rightNode.type;
      if (left.genericArguments.length === right.genericArguments.length) {

        // If given:    `private Map<String, Object> field = new HashMap<String, Object>()`
        // It becomes:  `private Map<String, Object> field = new HashMap<>()`
        right.genericArguments.length = 0;
        return rightNode;
      }
    }

    return undefined;
  }
}
