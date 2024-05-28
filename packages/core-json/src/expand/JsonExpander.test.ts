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
              {path: '/bar', prefix: 'Pre-', suffix: '-Post'},
              {path: '/baz', prefix: 'before-', suffix: '-after'},
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
            using: ['x', 'y', 'z'],
            at: [
              {path: '/bar', prefix: 'Pre-', suffix: '-Post'},
              {path: '/baz', prefix: 'before-', suffix: '-after'},
            ],
          } satisfies ExpandOptions,
          'bar': 'BarValue',
          'baz': 'BazValue',
        },
        {
          'x-expand': {
            using: ['a', 'b', 'c'],
            at: [
              {path: '/fizz', prefix: 'Pre-', suffix: '-Post', transform: 'lowercase'},
              {path: '/buzz', prefix: 'before-', suffix: '-after', transform: 'uppercase'},
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
        {bar: 'Pre-z-Post', baz: 'before-z-after'},

        {fizz: 'pre-a-post', buzz: 'BEFORE-A-AFTER'},
        {fizz: 'pre-b-post', buzz: 'BEFORE-B-AFTER'},
        {fizz: 'pre-c-post', buzz: 'BEFORE-C-AFTER'},
      ],
    });
  });
});
