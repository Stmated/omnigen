import {AbstractJavaAstTransformer, Java, JavaAstTransformerArgs} from '@omnigen/target-java';

/**
 * Replace generic modifiers into specific Java modifiers, like `static final` -> `const`
 */
export class ToCSharpModifiersAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const newRoot = args.root.reduce({
      ...args.root.createReducer(),
      reduceModifierList: (n, r) => {

        const isStatic = n.children.some(it => it.type === Java.ModifierType.STATIC);
        const isFinal = n.children.some(it => it.type === Java.ModifierType.FINAL);

        if (isStatic && isFinal) {

          const altered = [...n.children].filter(it => it.type !== Java.ModifierType.CONST && it.type !== Java.ModifierType.STATIC && it.type !== Java.ModifierType.FINAL);

          altered.push(new Java.Modifier(Java.ModifierType.CONST));

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
