import {expect, test} from 'vitest';
import {OmniEndpoint, OmniItemKind, OmniModel, OmniObjectType, OmniProperty, OmniTypeKind} from '@omnigen/api';
import {OmniUtil} from './OmniUtil.ts';
import {OmniReducer} from './OmniReducer.ts';

test('no-op', () => {

  const model: OmniModel = {
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    endpoints: [],
    types: [],
  };

  const dispatcher = new OmniReducer({
    MODEL: n => n,
  });
  const reduced = dispatcher.reduce(model);

  expect(reduced).toBe(model);
});

test('swap-endpoints', () => {

  const endpointA: OmniEndpoint = {
    kind: OmniItemKind.ENDPOINT, name: 'A', request: {kind: OmniItemKind.INPUT, type: {kind: OmniTypeKind.STRING}, contentType: 'text/plain'}, transports: [], responses: [],
  };
  const endpointB: OmniEndpoint = {
    kind: OmniItemKind.ENDPOINT, name: 'B', request: {kind: OmniItemKind.INPUT, type: {kind: OmniTypeKind.BOOL}, contentType: 'text/json'}, transports: [], responses: [],
  };

  const model: OmniModel = {
    name: 'my-model',
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    endpoints: [endpointA],
    types: [],
  };

  const dispatcher = new OmniReducer({
    ENDPOINT: n => (n === endpointA) ? endpointB : n,
  });

  const reduced = dispatcher.reduce(model);

  expect(reduced).not.toBe(model);
  expect(reduced?.name).toEqual('my-model');

  expect(reduced?.endpoints[0]).toBe(endpointB);
});

test('swap-types', () => {

  const model: OmniModel = {
    name: 'my-model',
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    endpoints: [
      {kind: OmniItemKind.ENDPOINT, name: 'A', request: {kind: OmniItemKind.INPUT, type: {kind: OmniTypeKind.STRING}, contentType: 'text/plain'}, transports: [], responses: []},
    ],
    types: [],
  };

  const dispatcher = new OmniReducer({
    STRING: n => {
      return {kind: OmniTypeKind.INTEGER, description: n.description};
    },
  });
  const reduced = dispatcher.reduce(model);

  expect(reduced).not.toBe(model);
  expect(reduced?.name).toEqual('my-model');
  expect(reduced?.endpoints[0].request.type.kind).toEqual(OmniTypeKind.INTEGER);
});

test('swap-recursively', () => {

  const obj: OmniObjectType = {
    kind: OmniTypeKind.OBJECT,
    name: 'Obj',
    properties: [
    ],
  };

  obj.properties.push({kind: OmniItemKind.PROPERTY, type: {kind: OmniTypeKind.STRING}, name: 'P1', owner: obj});
  obj.properties.push({kind: OmniItemKind.PROPERTY, type: {kind: OmniTypeKind.INTEGER}, name: 'P2', owner: obj});

  const model: OmniModel = {
    name: 'my-model',
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    endpoints: [
      {kind: OmniItemKind.ENDPOINT, name: 'A', request: {kind: OmniItemKind.INPUT, type: obj, contentType: 'application/json'}, transports: [], responses: []},
    ],
    types: [obj],
  };

  const dispatcher = new OmniReducer({
    OBJECT: n => {
      return {kind: OmniTypeKind.FLOAT, description: n.description};
    },
  });
  const reduced = dispatcher.reduce(model);

  expect(reduced).not.toBe(model);
  expect(reduced?.name).toEqual('my-model');
  expect(reduced?.endpoints[0].request.type.kind).toEqual(OmniTypeKind.FLOAT);
  expect(reduced?.types).toHaveLength(1);
  expect(reduced?.types[0].kind).toEqual(OmniTypeKind.FLOAT);
});

test('swap-owner', () => {

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

  const p1: OmniProperty = {kind: OmniItemKind.PROPERTY, type: obj2, name: 'P1', owner: obj1};
  const p2: OmniProperty = {kind: OmniItemKind.PROPERTY, type: obj3, name: 'P2', owner: obj2};
  const p3: OmniProperty = {kind: OmniItemKind.PROPERTY, type: {kind: OmniTypeKind.DOUBLE}, name: 'P3', owner: obj3};

  obj1.properties.push(p1);
  obj2.properties.push(p2);
  obj3.properties.push(p3);

  const model: OmniModel = {
    name: 'my-model',
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    endpoints: [
      {kind: OmniItemKind.ENDPOINT, name: 'A', request: {kind: OmniItemKind.INPUT, type: obj1, contentType: 'application/json'}, transports: [], responses: []},
    ],
    types: [obj1, obj2, obj3],
  };

  let calls = 0;

  const dispatcher = new OmniReducer({
    reducer: {
      [OmniItemKind.PROPERTY]: (n, a) => {
        if (n === p1) {
          calls++;
          return {
            ...n,
            owner: obj2,
            debug: OmniUtil.addDebug(n.debug, `From call ${calls}`),
          };
        }
        return a.base.PROPERTY(n, a);
      },
    },
    track: true,
  });
  const reduced = dispatcher.reduce(model);

  expect(calls).toEqual(1);

  expect(reduced).not.toBe(model);
  expect(reduced?.name).toEqual('my-model');
  expect(reduced?.types).toHaveLength(3);

  const originalObj1 = model.types[0] as OmniObjectType;
  const originalObj2 = model.types[1] as OmniObjectType;
  const originalObj3 = model.types[2] as OmniObjectType;

  const endpointReducedObj = reduced?.endpoints[0].request.type as OmniObjectType;

  const reducedObj1 = reduced?.types[0] as OmniObjectType;
  const reducedObj2 = reduced?.types[1] as OmniObjectType;
  const reducedObj3 = reduced?.types[2] as OmniObjectType;

  const ownerReducedObj2FromObj1 = reducedObj1.properties[0].owner as OmniObjectType;
  const ownerReducedObj2FromObj2 = reducedObj2.properties[0].owner as OmniObjectType;
  const ownerReducedObj3 = reducedObj3.properties[0].owner as OmniObjectType;

  expect(reducedObj1).not.toBe(originalObj1);
  expect(reducedObj2).toBe(originalObj2);
  expect(reducedObj3).toBe(originalObj3);

  expect(endpointReducedObj).toBe(reducedObj1);
  expect(ownerReducedObj2FromObj1).toBe(ownerReducedObj2FromObj2);

  expect(ownerReducedObj2FromObj2).toBe(reducedObj2);
  expect(ownerReducedObj3).toBe(reducedObj3);

  expect(endpointReducedObj.kind).toEqual(OmniTypeKind.OBJECT);
  expect(endpointReducedObj.properties[0].owner).not.toBe(endpointReducedObj);
  expect(endpointReducedObj.properties[0].owner).toBe(reducedObj2);

  expect(reducedObj2.properties[0].name).toBe(reducedObj2.properties[0].name);
  expect(reducedObj2.properties[0]).toBe(reducedObj2.properties[0]);
});

test('swap-recursively-2', () => {

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

  obj1.properties.push({kind: OmniItemKind.PROPERTY, type: obj2, name: 'P1', owner: obj1});
  obj2.properties.push({kind: OmniItemKind.PROPERTY, type: obj3, name: 'P2', owner: obj2});
  obj3.properties.push({kind: OmniItemKind.PROPERTY, type: {kind: OmniTypeKind.DOUBLE}, name: 'P3', owner: obj3});

  const model: OmniModel = {
    name: 'my-model',
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    endpoints: [
      {kind: OmniItemKind.ENDPOINT, name: 'A', request: {kind: OmniItemKind.INPUT, type: obj1, contentType: 'application/json'}, transports: [], responses: []},
    ],
    types: [obj1],
  };

  const dispatcher = new OmniReducer({
    OBJECT: n => ({kind: OmniTypeKind.FLOAT, description: n.description}),
  });
  const reduced = dispatcher.reduce(model);

  expect(reduced).not.toBe(model);
  expect(reduced?.name).toEqual('my-model');
  expect(reduced?.endpoints[0].request.type.kind).toEqual(OmniTypeKind.FLOAT);
  expect(reduced?.types).toHaveLength(1);
  expect(reduced?.types[0].kind).toEqual(OmniTypeKind.FLOAT);
});
