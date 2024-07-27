import {describe, test, expect} from 'vitest';
import {FreeTextUtils, Java} from '../';

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
});
