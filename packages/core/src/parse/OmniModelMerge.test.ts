import {
  OmniObjectType,
  OmniPrimitiveKind,
  OmniProperty,
  OmniPropertyOrphan,
  OmniSuperTypeCapableType, OmniType,
  OmniTypeKind,
} from './OmniModel';
import {OmniModelMerge, Replacement} from './OmniModelMerge';
import {PropertyUtil} from './PropertyUtil';
import {OmniUtil} from './OmniUtil';

test('Not Similar', async () => {

  const a = createObject('a');
  const b = createObject('b');

  const replacements = OmniModelMerge.getReplacements(a, b);
  expect(replacements).toHaveLength(0);
});

test('Same Identity', async () => {

  const a = createObject('a');

  const replacements = OmniModelMerge.getReplacements(a, a);
  expect(replacements).toHaveLength(0);
});

test('Similar (Empty)', async () => {

  const a1 = createObject('a');
  const a2 = createObject('a');

  compare(OmniModelMerge.getReplacements(a1, a2), [
    {root: a1, from: a1, to: a1},
    {root: a2, from: a2, to: a1},
  ]);
});

test('Similar (Same Properties)', async () => {

  const a1 = createObject('a', undefined, createPrimitive('x'));
  const a2 = createObject('a', undefined, createPrimitive('x'));

  const replacements = OmniModelMerge.getReplacements(a1, a2);
  expect(replacements).toHaveLength(4);

  const objectReplacements = replacements.filter(byObjects);

  compare(objectReplacements, [
    {root: a1, from: a1, to: a1},
    {root: a2, from: a2, to: a1},
  ]);
});

test('Similar (Diff Property Names)', async () => {

  const a1 = createObject('a', undefined, createPrimitive('x'));
  const a2 = createObject('a', undefined, createPrimitive('y'));

  const replacements = OmniModelMerge.getReplacements(a1, a2).filter(byObjects);
  expect(replacements).toHaveLength(0);
});

test('Similar (Diff Property Types)', async () => {

  const a1 = createObject('a', undefined, createPrimitive('x', OmniPrimitiveKind.DOUBLE));
  const a2 = createObject('a', undefined, createPrimitive('x', OmniPrimitiveKind.INTEGER));

  const replacements = OmniModelMerge.getReplacements(a1, a2).filter(byObjects);
  expect(replacements).toHaveLength(0);
});

test('Supertype (Same Supertype)', async () => {

  const a1 = createObject('a', undefined, createPrimitive('x'));
  const a2 = createObject('a', undefined, createPrimitive('x'));

  const b1 = createObject('b', a1);
  const b2 = createObject('b', a2);

  compare(OmniModelMerge.getReplacements(b1, b2).filter(byObjects), [
    {from: a1, to: a1},
    {from: a2, to: a1},
    {from: b1, to: b1},
    {from: b2, to: b1},
  ]);
});

test('Supertype (Diff Supertype)', async () => {

  const a1 = createObject('a', undefined, createPrimitive('x'));
  const a2 = createObject('a', undefined, createPrimitive('x'));

  const b1 = createObject('b1', a1);
  const b2 = createObject('b2', a2);

  compare(OmniModelMerge.getReplacements(b1, b2).filter(byObjects), [
    {from: a1, to: a1},
    {from: a2, to: a1},
  ]);
});

test('Supertype (Diff levels)', async () => {

  const a1 = createObject('a', undefined, createPrimitive('x'));
  const a2 = createObject('a', undefined, createPrimitive('x'));

  const b1 = createObject('b1', a1);

  const c1 = createObject('c1', b1);
  const c2 = createObject('c2', a2);

  compare(OmniModelMerge.getReplacements(c1, c2).filter(byObjects), [
    {root: c1, from: a1, to: a1},
    {root: c2, from: a2, to: a1},
  ]);
});

function compare(expected: Replacement<OmniType>[], given: Partial<Replacement<OmniType>>[]): void {

  if (expected.length != given.length) {
    expect(expected).toEqual(given);
  }

  for (let i = 0; i < expected.length; i++) {
    if (given[i].root && given[i].root != expected[i].root) {
      const e = OmniUtil.describe(expected[i].root);
      const g = OmniUtil.describe(given[i].root);
      throw new Error(`Expected ${i} to have root '${e}', but got '${g} (identity not same)'`);
    }

    if (given[i].from && given[i].from != expected[i].from) {
      const e = OmniUtil.describe(expected[i].from);
      const g = OmniUtil.describe(given[i].from);
      throw new Error(`Expected ${i} to have from '${e}', but got '${g} (identity not same)'`);
    }

    if (given[i].to && given[i].to != expected[i].to) {
      const e = OmniUtil.describe(expected[i].to);
      const g = OmniUtil.describe(given[i].to);
      throw new Error(`Expected ${i} to have to '${e}', but got '${g}' (identity not same)`);
    }
  }
}

function byObjects(replacement: Replacement<OmniType>) {
  return replacement.from.kind == OmniTypeKind.OBJECT;
}

function createObject(name: string, extendedBy?: OmniSuperTypeCapableType, ...properties: OmniPropertyOrphan[]): OmniObjectType {

  const type: OmniObjectType = {
    kind: OmniTypeKind.OBJECT,
    properties: [],
    name: name,
    extendedBy: extendedBy,
  };

  if (properties) {
    for (const property of properties) {
      PropertyUtil.addProperty(type, property);
    }
  }

  return type;
}

function createPrimitive(name: string, primitiveKind = OmniPrimitiveKind.DOUBLE): Omit<OmniProperty, 'owner'> {
  return {
    type: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: primitiveKind},
    name: name,
  };
}
