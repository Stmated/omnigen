import {expect, test, describe} from 'vitest';
import {OmniItemKind, OmniModel, OmniObjectType, OmniTypeKind, OmniUnionType} from '@omnigen/api';
import {ProxyReducer, ProxyReducerFn, REDUCE_ANY} from './ProxyReducer.ts';
import {ProxyReducerOmni} from './ProxyReducerOmni.ts';
import {assertDefined, assertDiscriminator, expectTs} from '../util';

test('change-field', () => {

  const model: OmniModel = {
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    endpoints: [],
    types: [],
  };

  const reducer = ProxyReducerOmni.create({
    MODEL: n => {
      n.description = 'Hello';
    },
  });
  const reduced = reducer.reduce(model);

  expect(reduced).not.toBe(model);
  expect(reduced?.description).toBe('Hello');

  expect(model.description).toBeUndefined();
});

test('swap-recursively-3', () => {

  const obj1: OmniObjectType = {
    kind: OmniTypeKind.OBJECT,
    name: 'Obj1',
    properties: [],
  };

  const obj2: OmniObjectType = {
    kind: OmniTypeKind.OBJECT,
    name: 'Obj2',
    properties: [],
  };

  const obj3: OmniObjectType = {
    kind: OmniTypeKind.OBJECT,
    name: 'Obj3',
    properties: [],
  };

  const union: OmniUnionType = {
    kind: OmniTypeKind.UNION,
    name: 'Union',
    types: [obj1, obj2, obj3],
  };

  obj1.properties.push({kind: OmniItemKind.PROPERTY, type: obj2, name: 'P1'});
  obj2.properties.push({kind: OmniItemKind.PROPERTY, type: obj3, name: 'P2'});
  obj3.properties.push({kind: OmniItemKind.PROPERTY, type: {kind: OmniTypeKind.DOUBLE}, name: 'P3'});

  const model: OmniModel = {
    name: 'my-model',
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    endpoints: [
      {kind: OmniItemKind.ENDPOINT, name: 'A', request: {kind: OmniItemKind.INPUT, type: obj1, contentType: 'application/json'}, transports: [], responses: []},
      {kind: OmniItemKind.ENDPOINT, name: 'B', request: {kind: OmniItemKind.INPUT, type: union, contentType: 'application/json'}, transports: [], responses: []},
    ],
    types: [obj1, union],
  };

  let objectReduceCount = 0;
  let propertyReduceCount = 0;
  const reducer = ProxyReducerOmni.create({
    OBJECT: () => {
      return {kind: OmniTypeKind.FLOAT, description: `Description #${++objectReduceCount}`};
    },
    PROPERTY: n => {
      propertyReduceCount++;
      n.description = 'Should not happen, since object type is removed';
    },
    FLOAT: n => {
      n.summary = 'A Summary';
    },
  });

  const reduced = reducer.reduce(model);

  expect(reduced).not.toBe(model);
  expect(reduced?.name).toEqual('my-model');
  expect(reduced?.endpoints[0].request.type.kind).toEqual(OmniTypeKind.FLOAT);
  expect(reduced?.types).toHaveLength(2);
  expect(reduced?.types[0].kind).toEqual(OmniTypeKind.FLOAT);
  expect(reduced?.types[0].summary).toEqual('A Summary');

  expect(propertyReduceCount).toBe(0);

  expect(model?.types[0].kind).toEqual(OmniTypeKind.OBJECT);
});

interface Base {
  readonly foo?: Foo | undefined;
  readonly bar?: Bar | undefined;
  readonly baz?: Baz | undefined;
}

interface Foo extends Base {
  readonly k: 'Foo';
  readonly x: number;
  readonly y: number;
  readonly common?: string;
}

interface Bar extends Base {
  readonly k: 'Bar';
  readonly a: number;
  readonly b: number;
  readonly common?: string;
}

interface Baz {
  readonly k: 'Baz';
  readonly v?: unknown;
}

type Types = Foo | Bar | Baz;
type TypesOverride = { Foo: Foo | Bar };

const fooBarReducer: ProxyReducerFn<Types, Foo | Bar, 'k', TypesOverride> = (n, a) => {
  if (n.foo) {
    const reduced = a.reducer.reduce(n.foo);
    if (reduced.k === 'Foo') {
      n.foo = reduced;
    } else {
      n.bar = reduced;
    }
  }
  if (n.bar) n.bar = a.reducer.reduce(n.bar);
  if (n.baz) n.baz = a.reducer.reduce(n.baz);
  return n;
};

const typesReducerFactory = ProxyReducer.createFactory<Types, 'k', TypesOverride>('k', {
  Foo: (n, a) => fooBarReducer(n, a),
  Bar: (n, a) => {
    const reduced = fooBarReducer(n, a);
    return reduced ? assertDiscriminator(reduced, 'k', 'Bar') : undefined;
  },
});

test('swap-field-custom', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};

  let anyCalls = 0;
  const reducer = typesReducerFactory({
    [REDUCE_ANY]: () => {
      anyCalls++;
    },
    Foo: n => {
      n.common = 'bye';
    },
  });

  const reduced = reducer.reduce(foo);

  expect(reduced).not.toBe(foo);
  expect(reduced?.common).toBe('bye');
  expect(anyCalls).toBe(1);
});

test('swap-object-custom', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};
  const foo2: Foo = {k: 'Foo', x: 20, y: 30, common: 'yo'};

  let anyCalls = 0;
  const reducer = typesReducerFactory({
    [REDUCE_ANY]: () => {
      anyCalls++;
    },
    Foo: () => foo2,
  });

  const reduced = reducer.reduce(foo);

  expectTs.toBeDefined(reduced);
  expect(reduced).not.toBe(foo);
  expect(reduced, 'Should be same, since we returned it as such (we say we manage it)').toBe(foo2);
  expectTs.propertyToBe(reduced, 'k', 'Foo');

  expect(reduced.x).toBe(20);
  expect(reduced.y).toBe(30);
  expect(reduced.common).toBe('yo');
  expect(anyCalls).toBe(1);
});

test('swap-object-and-field-custom', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};
  const foo2: Foo = {k: 'Foo', x: 34, y: 40, common: 'yo'};
  const bar: Bar = {k: 'Bar', a: 50, b: 60, common: 'hi'};

  let anyCalls = 0;
  const reducer = typesReducerFactory({
    [REDUCE_ANY]: () => {
      anyCalls++;
    },
    Foo: n => {
      if (n === foo) {
        return foo2;
      }

      return bar;
    },
  });

  const reduced = reducer.reduce(foo);

  expect(reduced).not.toBe(foo);
  expect(reduced, 'Should be same, since we returned it as such (we say we manage it)').toBe(bar);
  expectTs.propertyToBe(reduced, 'k', 'Bar');
  expect(reduced?.a).toBe(50);
  expect(reduced?.b).toBe(60);
  expect(reduced?.common).toBe('hi');
  expect(anyCalls).toBe(1);
});

test('swap-custom', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};

  const reducer = typesReducerFactory({
    Foo: n => {
      n.common = 'bye';
    },
  });

  const reduced = reducer.reduce(foo);

  expect(reduced).not.toBe(foo);
  expect(reduced?.common).toBe('bye');
});

describe('struct-recursive', () => {

  const baz1: Baz = {k: 'Baz', v: 1};
  const baz2: Baz = {k: 'Baz', v: '2'};
  const foo1: Foo = {k: 'Foo', x: 1, y: 11, common: 'hello1', baz: baz1};
  const foo2: Foo = {k: 'Foo', x: 2, y: 22, common: 'hello2', foo: foo1, baz: baz2};
  const bar1: Bar = {k: 'Bar', a: 1, b: 11, foo: foo2};
  const bar2: Bar = {k: 'Bar', a: 2, b: 22, foo: foo1, bar: bar1};

  test('struct-recursive_reducer-!recursive', () => {

    const reducer = typesReducerFactory({
      Foo: n => {
        n.common = 'bye';
        n.x++;
      },
    });

    const reduced = reducer.reduce(bar2);

    expect(reduced).not.toBe(bar2);
    expect(reduced?.foo?.common).toEqual('bye');
    expect(reduced?.foo?.x).toEqual(2);
    expect(reduced?.foo?.y).toEqual(11);
    expect(reduced?.foo?.baz?.v).toEqual(1);
    expect(reduced?.bar?.foo?.foo?.common).toEqual('hello1'); // Kept, since Foo reducer does not recurse
    expect(reduced?.bar?.foo?.x).toEqual(3); // Changed, since Foo inside Bar is recursed into
    expect(reduced?.bar?.foo?.y).toEqual(22);
  });

  test('struct-recursive_reducer-recursive', () => {

    const reducer = typesReducerFactory({
      Foo: (n, a) => {

        // First we change some properties, then do the "default" reducing.
        const common = n.common ?? '';
        n.common = 'bye' + common.substring(common.length - 1);
        n.x++;
        return a.reducer.reduce(n);
      },
    });

    const reduced = reducer.reduce(bar2);

    expect(reduced).not.toBe(bar2);
    expect(reduced?.foo?.common).toEqual('bye1');
    expect(reduced?.foo?.x).toEqual(2);
    expect(reduced?.foo?.y).toEqual(11);
    expect(reduced?.foo?.baz?.v).toEqual(1);
    expect(reduced?.bar?.foo?.common).toEqual('bye2');
    expect(reduced?.bar?.foo?.foo?.common).toEqual('bye1');
    expect(reduced?.bar?.foo?.x).toEqual(3);
    expect(reduced?.bar?.foo?.y).toEqual(22);
  });
});


