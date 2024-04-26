import {describe, test, expect} from 'vitest';
import {FreeTextUtils, Java} from '../';

describe('FreeTextUtils', () => {

  test('summary+summary', () => {

    const a = new Java.FreeTextSummary('foo');
    const b = new Java.FreeTextSummary('bar');

    const result = FreeTextUtils.add(a, b);

    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Java.FreeTextSummary);
  });
});
