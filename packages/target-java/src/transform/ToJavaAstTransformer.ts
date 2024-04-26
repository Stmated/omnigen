import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import * as Java from '../ast';

/**
 * For fixing or replacing some more generic AST-structures into Java-specific ones.
 *
 * Such as:
 * - Replace generic modifiers into specific Java modifiers, like `const` -> `static final`
 */
export class ToJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const baseReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...baseReducer,

      reduceModifierList: (n, r) => {

        const constIndex = n.children.findIndex(it => it.type === Java.ModifierType.CONST);
        if (constIndex !== -1) {

          const altered = [...n.children].filter(it => it.type === Java.ModifierType.CONST || it.type === Java.ModifierType.STATIC || it.type === Java.ModifierType.FINAL);

          altered.push(new Java.Modifier(Java.ModifierType.STATIC));
          altered.push(new Java.Modifier(Java.ModifierType.FINAL));

          return new Java.ModifierList(...altered).withIdFrom(n);
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
