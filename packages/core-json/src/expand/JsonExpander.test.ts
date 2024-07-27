import {describe, test, expect} from 'vitest';
import {ExpandOptions, JsonExpander} from './JsonExpander.ts';

describe('JsonExpander', () => {

  const expander = new JsonExpander();

  test('noop', () => {

    const obj = {foo: 'bar'};
    expect(expander.expand(obj)).toBe(obj);
  });

  test('find-path', () => {

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
    expect(expander.expand(obj)).toEqual({
      foo: 'a',
      array: [
        {baz: 'x'},
        {baz: 'y'},
        {baz: 'z'},
      ],
    });
  });

  test('find-path-key', () => {

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
          'bar': 'BarValue',
          'baz': 'BazValue',
        },
      ],
    };
    expect(expander.expand(obj)).toEqual({
      foo: 'a',
      array: [
        {bar: 'Pre-x-Post', baz: 'before-x-after'},
        {bar: 'Pre-y-Post', baz: 'before-y-after'},
        {bar: 'Pre-z-Post', baz: 'before-z-after'},
      ],
    });
  });

  test('double-replace', () => {

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
          'bar': 'BarValue',
          'baz': 'BazValue',
        },
        {
          'x-expand': {
            using: ['a', ['b', 'bE'], 'c'],
            at: [
              {path: '/fizz', with: 'Pre-$1-Post', transform: 'lowercase'},
              {path: '/buzz', with: 'before-$1-after', transform: 'uppercase'},
            ],
          } satisfies ExpandOptions,
          'fizz': 'FizzValue',
          'buzz': 'BuzzValue',
        },
      ],
    };

    expect(expander.expand(obj)).toEqual({
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
