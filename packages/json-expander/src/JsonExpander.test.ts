import {describe, test} from 'vitest';
import {ExpandConfig, JsonExpander} from './JsonExpander';
import pointer from 'json-pointer';

describe('JsonExpander', () => {

  const expander = new JsonExpander();

  test('noop', ctx => {

    const obj = {foo: 'bar'};
    ctx.expect(expander.expand(obj)).toBe(obj);
  });

  test('find-path', ctx => {

    const obj = {
      foo: 'a',
      array: [
        {
          'x-expand': {
            using: ['x', 'y', 'z'],
            at: [{path: '/baz'}],
          } satisfies ExpandConfig,
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

  test('find-path-key', ctx => {

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
          } satisfies ExpandConfig,
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

  test('double-replace', ctx => {

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
          } satisfies ExpandConfig,
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
          } satisfies ExpandConfig,
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

  test('external-file-loader', ctx => {

    const obj1 = {
      foo: {
        'x-expand': {
          using: ['a', 'b', 'c'],
          at: [
            {path: '/name', with: '$0'},
            {
              path: '/data', with: [
                {attempt: 'obj2.json#/$0_object', as: 'path', giving: 'clone'},
                {attempt: 'obj2.json#/some_array', giving: 'ref'},
              ],
            },
          ],
        } satisfies ExpandConfig,
        name: 'foo',
        data: 'placeholder',
      },
      bar: {
        'x-expand': {
          using: ['x', 'y', 'z'],
          at: [
            {path: '/name', with: '$0'},
            {
              path: '/data', with: [
                {attempt: 'obj2.json#/$0_object'},
              ],
            },
          ],
        } satisfies ExpandConfig,
        name: 'bar',
        data: 'placeholder',
      },
    } as const;

    const obj2 = {
      b_object: {
        string_property: 'hello',
      },
      x_object: {
        boolean_property: true,
      },
      some_array: [
        'value1',
        2,
        {key: '3'},
      ],
      some_object: {
        fallback: true,
      },
    };

    const loadableExpander = new JsonExpander(uri => {

      if (uri.hasFileName('obj2.json')) {
        const hash = uri.absoluteHash;
        if (pointer.has(obj2, hash)) {
          return pointer.get(obj2, hash);
        }
      }

      return undefined;
    });

    const expanded = loadableExpander.expand(obj1) as any;

    ctx.expect(expanded).toEqual({
      a: {name: 'a', data: obj2.some_array},
      b: {
        name: 'b',
        data: {
          string_property: 'hello',
        },
      },
      c: {name: 'c', data: obj2.some_array},
      x: {name: 'x', data: 'obj2.json#/x_object'},
      y: {name: 'y', data: 'placeholder'},
      z: {name: 'z', data: 'placeholder'},
    });

    ctx.expect(expanded.a.data).toBe(obj2.some_array);
    ctx.expect(expanded.b).not.toBe(obj2.b_object);
    ctx.expect(expanded.c.data).toBe(obj2.some_array);
  });
})
;
