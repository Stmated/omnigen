import {expect, test} from 'vitest';
import {OmniItemKind, OmniModel, OmniObjectType, OmniTypeKind, OmniUnionType} from '@omnigen/api';
import {createProxyReducerCreator, REDUCE_ANY} from './ProxyReducer.ts';
import {createProxyReducerOmni} from './ProxyReducerOmni.ts';
import {expectTs} from '../util';

test('change-field', () => {

  const model: OmniModel = {
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    endpoints: [],
    types: [],
  };

  const dispatcher = createProxyReducerOmni({
    MODEL: n => {
      n.description = 'Hello';
    },
  });
  const reduced = dispatcher.reduce(model);

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
  const dispatcher = createProxyReducerOmni({
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

  const reduced = dispatcher.reduce(model);

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
  foo?: Foo;
  bar?: Bar;
  baz?: Baz;
}

interface Foo extends Base {
  k: 'Foo';
  x: number;
  y: number;
  common?: string;
}

interface Bar extends Base {
  k: 'Bar';
  a: number;
  b: number;
  common?: string;
}

interface Baz {
  k: 'Baz';
}

type Types = Foo | Bar | Baz;

const createProxyReducerTypes = createProxyReducerCreator<Types, 'k', {
  Foo: Foo | Bar,
}>('k');

test('swap-field-custom', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};

  let anyCalls = 0;
  const dispatcher = createProxyReducerTypes({
    [REDUCE_ANY]: () => {
      anyCalls++;
    },
    Foo: n => {
      n.common = 'bye';
    },
  });

  const reduced = dispatcher.reduce(foo);

  expect(reduced).not.toBe(foo);
  expect(reduced?.common).toBe('bye');
  expect(anyCalls).toBe(1);
});

test('swap-object-custom', () => {

  const foo: Foo = {k: 'Foo', x: 10, y: 20, common: 'hello'};
  const foo2: Foo = {k: 'Foo', x: 20, y: 30, common: 'yo'};

  let anyCalls = 0;
  const dispatcher = createProxyReducerTypes({
    [REDUCE_ANY]: () => {
      anyCalls++;
    },
    Foo: () => foo2,
  });

  const reduced = dispatcher.reduce(foo);

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
  const dispatcher = createProxyReducerTypes({
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

  const reduced = dispatcher.reduce(foo);

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

  const dispatcher = createProxyReducerTypes({
    Foo: n => {
      n.common = 'bye';
    },
  });

  const reduced = dispatcher.reduce(foo);

  expect(reduced).not.toBe(foo);
  expect(reduced?.common).toBe('bye');
});
