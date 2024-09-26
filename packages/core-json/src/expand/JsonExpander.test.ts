import {describe, test} from 'vitest';
import {ExpandOptions, JsonExpander} from './JsonExpander.ts';

describe('JsonExpander', () => {

  const expander = new JsonExpander();

  test.concurrent('noop', ctx => {

    const obj = {foo: 'bar'};
    ctx.expect(expander.expand(obj)).toBe(obj);
  });

  test.concurrent('find-path', ctx => {

    const obj = {
      foo: 'a',
      array: [
        {
          $expand: {
            using: ['x', 'y', 'z'],
            at: '/baz',
          } satisfies ExpandOptions,
          baz: 'q',
        },
      ],
    };
    ctx.expect(expander.expand(obj)).toEqual({
      foo: 'a',
      array: [
        {baz: 'x'},
        {baz: 'y'},
        {baz: 'z'},
      ],
    });
  });

  test.concurrent('find-path-key', ctx => {

    const obj = {
      foo: 'a',
      array: [
        {
          'x-expand': {
            using: ['x', 'y', 'z'],
            at: [
              {path: '/bar', with: 'Pre-$0-Post'},
              {path: '/baz', with: 'before-$0-after'},
            ],
          } satisfies ExpandOptions,
          bar: 'BarValue',
          baz: 'BazValue',
        },
      ],
    };
    ctx.expect(expander.expand(obj)).toEqual({
      foo: 'a',
      array: [
        {bar: 'Pre-x-Post', baz: 'before-x-after'},
        {bar: 'Pre-y-Post', baz: 'before-y-after'},
        {bar: 'Pre-z-Post', baz: 'before-z-after'},
      ],
    });
  });

  test.concurrent('double-replace', ctx => {

    const obj = {
      foo: 'a',
      array: [
        {
          'x-expand': {
            using: ['x', 'y', ['z', 'ZED']],
            at: [
              {path: '/bar', with: 'Pre-$0-Post'},
              {path: '/baz', with: 'before-$1-after'},
            ],
          } satisfies ExpandOptions,
          bar: 'BarValue',
          baz: 'BazValue',
        },
        {
          'x-expand': {
            using: ['a', ['b', 'bE'], 'c'],
            at: [
              {path: '/fizz', with: 'Pre-$1-Post', transform: 'lowercase'},
              {path: '/buzz', with: 'before-$1-after', transform: 'uppercase'},
            ],
          } satisfies ExpandOptions,
          fizz: 'FizzValue',
          buzz: 'BuzzValue',
        },
      ],
    };

    ctx.expect(expander.expand(obj)).toEqual({
      foo: 'a',
      array: [
        {bar: 'Pre-x-Post', baz: 'before-x-after'},
        {bar: 'Pre-y-Post', baz: 'before-y-after'},
        {bar: 'Pre-z-Post', baz: 'before-ZED-after'},

        {fizz: 'Pre-a-Post', buzz: 'before-A-after'},
        {fizz: 'Pre-be-Post', buzz: 'before-BE-after'},
        {fizz: 'Pre-c-Post', buzz: 'before-C-after'},
      ],
    });
  });
});
