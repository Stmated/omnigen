import {describe, test} from 'vitest';

describe('Plugin2 Tests', () => {

  test('basic', ctx => {
    ctx.expect(1).toEqual(1);
  });
});
