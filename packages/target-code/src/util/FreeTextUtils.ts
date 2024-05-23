import * as FreeText from '../ast/FreeText';

export class FreeTextUtils {

  public static fromFriendlyFreeText(text: FreeText.FriendlyFreeTextIn): FreeText.AnyFreeText {
    if (typeof text == 'string') {
      return new FreeText.FreeText(text);
    } else {
      if (Array.isArray(text)) {
        if (text.length == 1) {
          return FreeTextUtils.fromFriendlyFreeText(text[0]);
        }

        return new FreeText.FreeTexts(...text.map(it => FreeTextUtils.fromFriendlyFreeText(it)));
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
  public static add(existing: FreeText.AnyFreeText | undefined, add: FreeText.AnyFreeText | FreeText.FriendlyFreeTextIn): FreeText.AnyFreeText {

    if (!existing) {
      if (add instanceof FreeText.AbstractFreeText) {
        return add;
      } else {
        return FreeTextUtils.fromFriendlyFreeText(add);
      }
    } else {
      // TODO: If adding a "summary" and there already is a summary, then add it to the existing summary as a paragraph (the first one should not be a paragraph)

      const original = existing;
      if (!(existing instanceof FreeText.FreeTexts)) {
        existing = new FreeText.FreeTexts(existing);
      }

      // NOTE: Perhaps this should be added as different types of freetext depending on what the already existing one is.

      if (add instanceof FreeText.FreeTextTypeLink) {
        for (const existingChild of existing.children) {
          if (existingChild instanceof FreeText.FreeTextTypeLink) {
            if (existingChild.type == add.type) {
              return original;
            }
          }
        }
      }

      if (add instanceof FreeText.FreeTextExample) {
        for (const existingChild of existing.children) {
          if (existingChild instanceof FreeText.FreeTextExample) {
            if (existingChild.content == add.content) {
              return original;
            }
          }
        }
      }

      if (add instanceof FreeText.FreeTextSummary) {
        for (const existingChild of existing.children) {
          if (existingChild instanceof FreeText.FreeTextSummary) {

            const replacement = FreeTextUtils.simplify(FreeTextUtils.add(existingChild.content, new FreeText.FreeTextParagraph(add.content)));

            const newChildren = [...existing.children];
            const existingChildIndex = newChildren.indexOf(existingChild);
            newChildren.splice(existingChildIndex, 1, replacement);

            return new FreeText.FreeTextSummary(newChildren);
          }
        }
      }

      const newChildren: FreeText.AnyFreeText[] = [...existing.children];

      newChildren.push(FreeTextUtils.fromFriendlyFreeText(add));

      const order = [
        FreeText.FreeTextSummary,
        FreeText.FreeTextLine,
        FreeText.FreeTextExample,
        FreeText.FreeTextTypeLink,
        FreeText.FreeTextMemberLink,
        FreeText.FreeTextPropertyLink,
      ];
      newChildren.sort((a, b) => {

        const aIndex = order.findIndex(it => a instanceof it || (a instanceof FreeText.FreeTextLine ? a.child instanceof it : false));
        const bIndex = order.findIndex(it => b instanceof it || (b instanceof FreeText.FreeTextLine ? b.child instanceof it : false));

        if (aIndex !== -1 && bIndex !== -1) {
          const result = (aIndex - bIndex);
          if (result !== 0) {
            return result;
          }
        }

        return 0;
      });

      return FreeTextUtils.simplify(new FreeText.FreeTexts(newChildren));
    }
  }

  public static simplify(text: FreeText.AnyFreeText): FreeText.AnyFreeText {

    if (text instanceof FreeText.FreeTexts) {
      if (text.children.length == 1) {
        return text.children[0];
      }
    }

    return text;
  }
}
