import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import * as Java from '../ast/JavaAst';

/**
 * Group any free-ranging example texts into one example group with a section header.
 */
export class GroupExampleTextsToSectionAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const newRoot = args.root.reduce({
      ...args.root.createReducer(),
      reduceFreeTexts: (n, r) => {

        const examples: Java.AnyFreeText[] = [];
        const others: Java.AnyFreeText[] = [];

        for (const child of n.children) {
          if (child instanceof Java.FreeTextExample) {
            const reduced = child.content.reduce(r);
            if (reduced) {
              examples.push(reduced);
            }
          } else {
            others.push(child);
          }
        }

        if (examples.length > 0) {
          return new Java.FreeTexts(
            ...others,
            new Java.FreeTextHeader(2, new Java.FreeText(`Examples`)),
            new Java.FreeTextList(examples, false),
          );
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
