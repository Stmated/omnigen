import {
  OmniObjectType,
  OmniPrimitiveTangibleKind,
  OmniProperty,
  OmniPropertyOwner,
  OmniTypeKind,
} from '@omnigen/core';
import {PropertyUtil} from './PropertyUtil';
import {OMNI_GENERIC_FEATURES} from '@omnigen/core';
import {PropertyDifference, TypeDiffKind} from '@omnigen/core';
import {describe, test, expect} from 'vitest';

describe('Test PropertyUtil', () => {

  const f = OMNI_GENERIC_FEATURES;

  test('EqualityLevel Primitives', async () => {

    const a: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      properties: [],
      name: 'a',
    };

    const b: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      properties: [],
      name: 'b',
    };

    const c: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      properties: [],
      name: 'c',
    };

    const ax = addPrim(a, 'x', OmniTypeKind.STRING, 'foo');
    const ay = addPrim(a, 'y', OmniTypeKind.NUMBER);
    const az = addPrim(a, 'z', OmniTypeKind.DOUBLE);

    const bx = addPrim(b, 'x', OmniTypeKind.STRING);
    const by = addPrim(b, 'y', OmniTypeKind.DOUBLE, 'bar');
    const bz = addPrim(b, 'z', OmniTypeKind.DOUBLE);

    const cx = addPrim(c, 'x', OmniTypeKind.STRING, 'foo');
    const cy = addPrim(c, 'y', OmniTypeKind.INTEGER);
    const cz = addPrim(c, 'z', OmniTypeKind.DOUBLE, 'baz');

    expect(PropertyUtil.getPropertyEquality(ax, ay, f).propertyDiffs).toEqual([PropertyDifference.NAME]);
    expect(PropertyUtil.getPropertyEquality(az, by, f).propertyDiffs).toEqual([PropertyDifference.NAME]);

    expect(PropertyUtil.getPropertyEquality(by, cy, f).typeDiffs).toEqual([TypeDiffKind.SIZE, TypeDiffKind.PRECISION]);
    expect(PropertyUtil.getPropertyEquality(by, cy, f).propertyDiffs).toEqual([PropertyDifference.META]);

    expect(PropertyUtil.getPropertyEquality(ay, cy, f).typeDiffs).toEqual([TypeDiffKind.ISOMORPHIC_TYPE]);
    expect(PropertyUtil.getPropertyEquality(ay, cy, f).propertyDiffs).toEqual([]);

    expect(PropertyUtil.getPropertyEquality(ax, bx, f).propertyDiffs).toEqual([PropertyDifference.META]);
    expect(PropertyUtil.getPropertyEquality(bz, cz, f).propertyDiffs).toEqual([PropertyDifference.META]);

    expect(PropertyUtil.getPropertyEquality(ax, cx, f).propertyDiffs).toEqual([]);

    expect(PropertyUtil.getPropertyEquality(ax, ax, f).propertyDiffs ?? []).toEqual([]);
  });
});

function addPrim(owner: OmniPropertyOwner, name: string, primitiveKind: OmniPrimitiveTangibleKind, description?: string): OmniProperty {

  return PropertyUtil.addProperty(owner, {
    type: {kind: primitiveKind},
    name: name,
    description: description,
  });
}
