import {describe, test, expect} from 'vitest';
import {FreeTextUtils, Java} from '../';
import {expectTs} from '@omnigen/core';

describe('FreeTextUtils', () => {

  test('summary+summary', () => {

    const a = new Java.FreeTextSummary('foo');
    const b = new Java.FreeTextSummary('bar');

    const result = FreeTextUtils.add(a, b);

    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Java.FreeTexts);

    expect((result as Java.FreeTexts).children).toHaveLength(2);
    expect((result as Java.FreeTexts).children[0]).toBeInstanceOf(Java.FreeTextSummary);
    expect((result as Java.FreeTexts).children[1]).toBeInstanceOf(Java.FreeTextRemark);
  });

  test('lines', () => {

    let text: Java.AnyFreeText | undefined = undefined;
    for (let i = 0; i < 5; i++) {
      text = FreeTextUtils.add(text, new Java.FreeTextLine(`line-${i}`));
    }
    for (let i = 0; i < 5; i++) {
      text = FreeTextUtils.add(text, FreeTextUtils.fromFriendlyFreeText(`friendly-${i}`));
    }

    expectTs.toBeInstanceOf(text, Java.FreeTexts);
    expect(text.children.length).toBe(14);

    expectTs.toBeInstanceOf(text.children[0], Java.FreeTextLine);
    expectTs.toBeInstanceOf(text.children[1], Java.FreeTextLine);
    expectTs.toBeInstanceOf(text.children[2], Java.FreeTextLine);
    expectTs.toBeInstanceOf(text.children[3], Java.FreeTextLine);
    expectTs.toBeInstanceOf(text.children[4], Java.FreeTextLine);

    expectTs.toBeInstanceOf(text.children[5], Java.FreeText);

    expectTs.toBeInstanceOf(text.children[6], Java.FreeTextLine);
    expectTs.toBeInstanceOf(text.children[7], Java.FreeText);

    expectTs.toBeInstanceOf(text.children[8], Java.FreeTextLine);
    expectTs.toBeInstanceOf(text.children[9], Java.FreeText);

    expectTs.toBeInstanceOf(text.children[10], Java.FreeTextLine);
    expectTs.toBeInstanceOf(text.children[11], Java.FreeText);

    expectTs.toBeInstanceOf(text.children[12], Java.FreeTextLine);
    expectTs.toBeInstanceOf(text.children[13], Java.FreeText);
  });
});
