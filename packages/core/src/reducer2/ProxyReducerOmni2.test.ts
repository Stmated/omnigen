import {test} from 'vitest';
import {OmniItemKind, OmniModel, OmniObjectType, OmniPrimitiveType, OmniProperty, OmniTypeKind, OmniUnionType, OmniUnknownType, UnknownKind} from '@omnigen/api';
import {ProxyReducerOmni2} from './ProxyReducerOmni2';
import {expectTs} from '../util';

test('change-field', ctx => {

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

  ctx.expect(reduced).not.toBe(model);
  ctx.expect(reduced?.description).toBe('Hello');

  ctx.expect(model.description).toBeUndefined();
});

test('swap-recursively-3', ctx => {

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
    OBJECT: (n, r) => {
      const reduced = r.reduce({kind: OmniTypeKind.FLOAT, description: `Description #${++objectReduceCount}`});
      r.persist(reduced);
      return reduced;
    },
    PROPERTY: (n, r) => {
      propertyReduceCount++;
      r.set('description', 'Should not happen, since object type is removed');
      return r.next();
    },
    FLOAT: (n, r) => {
      return r.set('summary', 'A Summary');
    },
  });

  const reduced = reducer.reduce(model);

  ctx.expect(reduced).not.toBe(model);
  ctx.expect(reduced?.name).toEqual('my-model');
  ctx.expect(reduced?.endpoints[0].request.type.kind).toEqual(OmniTypeKind.FLOAT);
  ctx.expect(reduced?.types).toHaveLength(2);
  ctx.expect(reduced?.types[0].kind).toEqual(OmniTypeKind.FLOAT);
  ctx.expect(reduced?.types[0].summary).toEqual('A Summary');

  ctx.expect(propertyReduceCount).toBe(0);

  ctx.expect(model?.types[0].kind).toEqual(OmniTypeKind.OBJECT);
});

test('recursive-union', ctx => {

  const unknownType: OmniUnknownType = {kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.DYNAMIC_OBJECT};
  const unknownProperty: OmniProperty = {kind: OmniItemKind.PROPERTY, name: 'value', type: unknownType, required: true};
  const objType: OmniObjectType = {kind: OmniTypeKind.OBJECT, name: 'Obj', properties: [unknownProperty]};
  const strType: OmniPrimitiveType = {kind: OmniTypeKind.STRING, name: 'Str'};
  const unionType: OmniUnionType = {kind: OmniTypeKind.UNION, name: 'StrOrObj', types: [strType, objType]};

  // Add recursive property
  objType.properties.push({kind: OmniItemKind.PROPERTY, name: 'relation', type: objType, required: true});

  // Replace `DYNAMIC_OBJECT` with `ANY`.
  const reducer = ProxyReducerOmni2.builder().build({
    UNKNOWN: n => ({...n, unknownKind: UnknownKind.ANY}),
  });

  const reduced = reducer.reduce(unionType);
  expectTs.toBeDefined(reduced);
  expectTs.propertyToBe(reduced, 'kind', OmniTypeKind.UNION);

  ctx.expect(reduced).not.toBe(unionType);
  ctx.expect(reduced.types).toHaveLength(2);
  expectTs.propertyToBe(reduced, 'kind', OmniTypeKind.UNION);
  expectTs.propertyToBe(unionType, 'kind', OmniTypeKind.UNION);

  ctx.expect(reduced.types).toHaveLength(2);
  ctx.expect(reduced.types[0]).toBe(unionType.types[0]); // Still same, not changed
  ctx.expect(reduced.types[1]).not.toBe(unionType.types[1]); // Changed, since property 'value' type has changed

  expectTs.propertyToBe(reduced.types[1], 'kind', OmniTypeKind.OBJECT);
  ctx.expect(reduced.types[1].name).toEqual('Obj');
  ctx.expect(reduced.types[1].properties).toHaveLength(2);
  ctx.expect(reduced.types[1].properties[0].name).toEqual('value');
  ctx.expect(reduced.types[1].properties[1].name).toEqual('relation');
  ctx.expect(reduced.types[1].properties[1].type).toBe(reduced.types[1]); // Should be recursively replaced/resolved
});
