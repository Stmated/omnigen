import * as FreeText from '../ast/FreeText';
import {Visitor} from '@omnigen/core';
import {createCodeFreeTextVisitor} from '../visitor/FreeTextVisitor';
import {createCodeFreeTextReducer} from '../reduce/CodeAstReducer';
import {Arrayable} from '@omnigen/api';

const ORDER = [
  FreeText.FreeTextSummary,
  FreeText.FreeTextRemark,
  FreeText.FreeTextLine,
  FreeText.FreeTextExample,
  FreeText.FreeTextTypeLink,
  FreeText.FreeTextMemberLink,
  FreeText.FreeTextPropertyLink,
];

export class FreeTextUtils {

  public static fromFriendlyFreeText(text: FreeText.FriendlyFreeTextIn): FreeText.AnyFreeText {
    if (typeof text == 'string') {
      return new FreeText.FreeText(text);
    } else {
      if (Array.isArray(text)) {
        if (text.length === 1) {
          return FreeTextUtils.fromFriendlyFreeText(text[0]!);
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
   * @param existing - The potentially already existing freetext to merge with
   * @param add - The freetext of friendly freetext to add.
   */
  public static add(
    existing: FreeText.AnyFreeText | undefined,
    add: FreeText.AnyFreeText | FreeText.FriendlyFreeTextIn | undefined,
  ): FreeText.AnyFreeText {

    if (!existing) {
      // if (add instanceof FreeText.AbstractFreeText) {
      //   return add;
      // } else if (add) {
      if (add) {
        return FreeTextUtils.fromFriendlyFreeText(add);
      }

    } else if (add) {

      add = FreeTextUtils.fromFriendlyFreeText(add);
      // if (add instanceof FreeText.FreeText) {
      //
      //   // Since other text already exists, then we add this as a new line.
      //   add = new FreeText.FreeTextLine(add.text);
      //   // if (existing)
      // }

      const original = existing;
      const texts: FreeText.FreeTexts = (existing instanceof FreeText.FreeTexts)
        ? existing
        : new FreeText.FreeTexts(existing);

      // if (existing instanceof FreeText.FreeTexts) {
      //   newChildren.push(...existing.children);
      // } else {
      //   newChildren.push(existing);
      // }

      // if (existing.children[existing.children.length - 1] instanceof FreeText.FreeText) {
      //
      //   // The tail freetext is a regular text. We need to add a linebreak so it is properly formatted.
      //   existing.children.push(new FreeTextLine(''));
      // }

      // NOTE: Perhaps this should be added as different types of freetext depending on what the already existing one is.
      const visitor = createCodeFreeTextVisitor<FreeText.AnyFreeText>();
      const reducer = createCodeFreeTextReducer();

      const existingSummary = Visitor.single(Visitor.create(visitor, {
        visitFreeTextSummary: n => n,
      }), texts, texts);

      if (existingSummary) {
        add = add.reduce({...reducer, reduceFreeTextSummary: n => (FreeTextUtils.getText(n.content) === FreeTextUtils.getText(existingSummary)) ? undefined : n});
        add = add?.reduce({...reducer, reduceFreeTextSummary: n => new FreeText.FreeTextRemark(n.content)});
      }

      if (!add) {
        return texts;
      }

      if (add instanceof FreeText.FreeTextTypeLink) {
        for (const existingChild of texts.children) {
          if (existingChild instanceof FreeText.FreeTextTypeLink) {
            if (existingChild.type == add.type) {
              return original;
            }
          }
        }
      }

      if (add instanceof FreeText.FreeTextExample) {
        for (const existingChild of texts.children) {
          if (existingChild instanceof FreeText.FreeTextExample) {
            if (FreeTextUtils.getText(existingChild.content) == FreeTextUtils.getText(add.content)) {
              return original;
            }
          }
        }
      }

      if (add instanceof FreeText.FreeTextRemark) {
        for (const existingChild of texts.children) {
          if (existingChild instanceof FreeText.FreeTextRemark) {
            if (FreeTextUtils.getText(existingChild.content) == FreeTextUtils.getText(add.content)) {
              return original;
            }
          }
        }
      }

      if (add instanceof FreeText.FreeTextSummary) {
        for (const existingChild of texts.children) {
          if (existingChild instanceof FreeText.FreeTextSummary) {

            const replacement = FreeTextUtils.simplify(FreeTextUtils.add(existingChild.content, new FreeText.FreeTextParagraph(add.content)));

            const newChildren = [...texts.children];
            const existingChildIndex = newChildren.indexOf(existingChild);
            newChildren.splice(existingChildIndex, 1, replacement);

            return new FreeText.FreeTextSummary(FreeTextUtils.simplify(newChildren));
          }
        }
      }

      const newChildren: FreeText.AnyFreeText[] = [...texts.children];

      newChildren.push(add);
      newChildren.sort((a, b) => {

        const aIndex = ORDER.findIndex(it => a instanceof it || (a instanceof FreeText.FreeTextLine ? a.child instanceof it : false));
        const bIndex = ORDER.findIndex(it => b instanceof it || (b instanceof FreeText.FreeTextLine ? b.child instanceof it : false));

        if (aIndex !== -1 && bIndex !== -1) {
          const result = (aIndex - bIndex);
          if (result !== 0) {
            return result;
          }
        }

        return 0;
      });

      return FreeTextUtils.simplify(newChildren);
    }

    return new FreeText.FreeTexts();
  }

  public static addCommentSummary(target: FreeText.AnyFreeText | undefined, text: FreeText.FriendlyFreeTextIn): FreeText.AnyFreeText {

    if (!target) {
      return new FreeText.FreeTextSummary(text);
    }

    const visitor = createCodeFreeTextVisitor<FreeText.AnyFreeText>();
    const foundSummary = Visitor.single(Visitor.create(visitor, {
      visitFreeTextSummary: n => n,
    }), target, undefined);

    if (foundSummary) {
      return FreeTextUtils.add(target, new FreeText.FreeTextRemark(text));
    } else {
      return FreeTextUtils.add(target, new FreeText.FreeTextSummary(text));
    }
  }

  public static simplifyComment(text: Arrayable<FreeText.AnyFreeText>): FreeText.AnyFreeText {

    const simplified = FreeTextUtils.simplify(text);
    if (simplified instanceof FreeText.FreeTexts) {
      const first = simplified.children[0];
      if (first && first instanceof FreeText.FreeTextParagraph) {
        simplified.children[0] = first.child;
      }
    } else if (simplified instanceof FreeText.FreeTextParagraph) {
      return simplified.child;
    }

    return simplified;
  }

  public static simplify(text: Arrayable<FreeText.AnyFreeText>): FreeText.AnyFreeText {

    if (text && Array.isArray(text)) {

      // Explode any FreeTexts, so they are flattened with the given array.
      for (let i = 0; i < text.length; i++) {
        const current = text[i];
        if (current instanceof FreeText.FreeTexts) {
          text.splice(i, 1, ...current.children);
        }
      }

      if (text.length === 1) {
        text = text[0]!;
      }
    }

    if (text instanceof FreeText.FreeTexts) {

      text.children.splice(0, text.children.length, ...text.children.map(it => FreeTextUtils.simplify(it)));
      if (text.children.length === 1) {
        text = text.children[0]!;
      }
    }

    if (Array.isArray(text)) {
      return new FreeText.FreeTexts(...text);
    }

    return text;
  }

  public static getText(text: FreeText.FriendlyFreeTextIn): string | undefined {

    if (typeof text == 'string') {
      return text;
    }

    if (text instanceof FreeText.FreeText) {
      return text.text;
    }

    if (text instanceof FreeText.FreeTextSummary) {
      return this.getText(text.content);
    }

    if (text instanceof FreeText.FreeTextParagraph) {
      return this.getText(text.child);
    }

    if (text instanceof FreeText.FreeTextSection) {
      return this.getText(text.content);
    }

    if (text instanceof FreeText.FreeTextLine) {
      return this.getText(text.child);
    }

    if (text instanceof FreeText.FreeTextCode) {
      return this.getText(text.content);
    }

    if (text instanceof FreeText.FreeTextRemark) {
      return this.getText(text.content);
    }

    return undefined;
  }

  public static extract(text: FreeText.FriendlyFreeTextIn): FreeText.FriendlyFreeTextIn {

    if (typeof text === 'string') {
      return text;
    }

    if (Array.isArray(text)) {
      if (text.length === 1) {
        return FreeTextUtils.extract(text[0]!);
      }

      return text.map(it => FreeTextUtils.extract(it));
    }

    if (text instanceof FreeText.FreeTextSummary) {
      return FreeTextUtils.extract(text.content);
    }

    if (text instanceof FreeText.FreeTextParagraph) {
      return FreeTextUtils.extract(text.child);
    }

    if (text instanceof FreeText.FreeTextLine) {
      return FreeTextUtils.extract(text.child);
    }

    if (text instanceof FreeText.FreeTextCode) {
      return FreeTextUtils.extract(text.content);
    }

    if (text instanceof FreeText.FreeTextRemark) {
      return FreeTextUtils.extract(text.content);
    }

    return text;
  }
}
