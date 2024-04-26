import {Java} from '../';
import {AnyFreeText, FreeText, FreeTexts, FriendlyFreeTextIn} from '../ast';

export class FreeTextUtils {

  public static fromFriendlyFreeText(text: FriendlyFreeTextIn): AnyFreeText {
    if (typeof text == 'string') {
      return new FreeText(text);
    } else {
      if (Array.isArray(text)) {
        if (text.length == 1) {
          return FreeTextUtils.fromFriendlyFreeText(text[0]);
        }

        return new FreeTexts(...text.map(it => FreeTextUtils.fromFriendlyFreeText(it)));
      } else {
        return text;
      }
    }
  };

  /**
   * Helper function for adding a freetext to another (maybe existing) freetext.
   *
   * It should not really do any sophisticated merging other than adding the new freetext in a sensible way.
   *
   * It is up to the caller to have a somewhat structured freetext that is being added to and added as.
   *
   * @param existing The potentially already existing freetext to merge with
   * @param add The freetext of friendly freetext to add.
   */
  public static add(existing: Java.AnyFreeText | undefined, add: Java.AnyFreeText | Java.FriendlyFreeTextIn): Java.AnyFreeText {

    if (!existing) {
      if (add instanceof Java.AbstractFreeText) {
        return add;
      } else {
        return FreeTextUtils.fromFriendlyFreeText(add);
      }
    } else {
      // TODO: If adding a "summary" and there already is a summary, then add it to the existing summary as a paragraph (the first one should not be a paragraph)

      if (!(existing instanceof Java.FreeTexts)) {
        existing = new Java.FreeTexts(existing);
      }

      const order = [
        Java.FreeTextSummary,
        Java.FreeTextLine,
        Java.FreeTextExample,
        Java.FreeTextTypeLink,
        Java.FreeTextMethodLink,
        Java.FreeTextPropertyLink,
      ];

      // NOTE: Perhaps this should be added as different types of freetext depending on what the already existing one is.

      if (add instanceof Java.FreeTextSummary) {
        for (const existingChild of existing.children) {
          if (existingChild instanceof Java.FreeTextSummary) {

            const replacement = FreeTextUtils.simplify(FreeTextUtils.add(existingChild.content, new Java.FreeTextParagraph(add.content)));

            const newChildren = [...existing.children];
            const existingChildIndex = newChildren.indexOf(existingChild);
            newChildren.splice(existingChildIndex, 1, replacement);

            return new Java.FreeTextSummary(newChildren);
          }
        }
      }

      const newChildren: Java.AnyFreeText[] = [...existing.children];

      newChildren.push(FreeTextUtils.fromFriendlyFreeText(add));
      newChildren.sort((a, b) => {

        const aIndex = order.findIndex(it => a instanceof it || (a instanceof Java.FreeTextLine ? a.child instanceof it : false));
        const bIndex = order.findIndex(it => b instanceof it || (b instanceof Java.FreeTextLine ? b.child instanceof it : false));

        if (aIndex !== -1 && bIndex !== -1) {
          const result = (aIndex - bIndex);
          if (result !== 0) {
            return result;
          }
        }

        return 0;
      });

      return new Java.FreeTexts(newChildren);
    }
  }

  public static simplify(text: Java.AnyFreeText): Java.AnyFreeText {

    if (text instanceof Java.FreeTexts) {
      if (text.children.length == 1) {
        return text.children[0];
      }
    }

    return text;
  }
}
