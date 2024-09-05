import {expect, test} from 'vitest';
import {OmniItemKind, OmniModel, OmniObjectType, OmniTypeKind, OmniUnionType} from '@omnigen/api';
import {ProxyReducerOmni2} from './ProxyReducerOmni2.ts';

test('change-field', () => {

  const model: OmniModel = {
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    endpoints: [],
    types: [],
  };

  const reducer = ProxyReducerOmni2.builder().build({
    MODEL: (n, r) => {
      return r.set('description', 'Hello'); // n.description = 'Hello';
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
  const reducer = ProxyReducerOmni2.builder().build({
    OBJECT: () => {
      return {kind: OmniTypeKind.FLOAT, description: `Description #${++objectReduceCount}`};
    },
    PROPERTY: (n, r) => {
      propertyReduceCount++;
      return r.set('description', 'Should not happen, since object type is removed');
      // n.description = ;
    },
    FLOAT: (n, r) => {
      // n.summary = 'A Summary';
      return r.set('summary', 'A Summary');
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
