import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import * as Java from '../ast/JavaAst';
import {TokenKind} from '../ast/JavaAst';
import {CodeAstUtils} from '@omnigen/target-code';

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

      reduceModifierList: n => {

        const constIndex = n.children.findIndex(it => it.kind === Java.ModifierKind.CONST);
        if (constIndex !== -1) {

          const altered = [...n.children].filter(it => it.kind === Java.ModifierKind.CONST || it.kind === Java.ModifierKind.STATIC || it.kind === Java.ModifierKind.FINAL);

          altered.push(new Java.Modifier(Java.ModifierKind.STATIC));
          altered.push(new Java.Modifier(Java.ModifierKind.FINAL));

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
