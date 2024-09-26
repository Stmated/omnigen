import {describe, test} from 'vitest';

describe('Plugin2 Tests', () => {

  test.concurrent('basic', ctx => {
    ctx.expect(1).toEqual(1);
  });
});
