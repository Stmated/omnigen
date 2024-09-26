import {
  OmniItemKind,
  OmniObjectType,
  OmniPrimitiveTangibleKind,
  OmniProperty,
  OmniPropertyOwner,
  OmniTypeKind,
} from '@omnigen/api';
import {PropertyUtil} from './PropertyUtil';
import {OMNI_GENERIC_FEATURES} from '@omnigen/api';
import {PropertyDifference, TypeDiffKind} from '@omnigen/api';
import {describe, test} from 'vitest';

describe('Test PropertyUtil', () => {

  const f = OMNI_GENERIC_FEATURES;

  test.concurrent('EqualityLevel Primitives', async ctx => {

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

    ctx.expect(PropertyUtil.getPropertyEquality(ax, ay, f).propertyDiffs).toEqual([PropertyDifference.NAME]);
    ctx.expect(PropertyUtil.getPropertyEquality(az, by, f).propertyDiffs).toEqual([PropertyDifference.NAME]);

    ctx.expect(PropertyUtil.getPropertyEquality(by, cy, f).typeDiffs).toEqual([TypeDiffKind.SIZE, TypeDiffKind.PRECISION]);
    ctx.expect(PropertyUtil.getPropertyEquality(by, cy, f).propertyDiffs).toEqual([PropertyDifference.META]);

    ctx.expect(PropertyUtil.getPropertyEquality(ay, cy, f).typeDiffs).toEqual([TypeDiffKind.ISOMORPHIC_TYPE]);
    ctx.expect(PropertyUtil.getPropertyEquality(ay, cy, f).propertyDiffs).toEqual([]);

    ctx.expect(PropertyUtil.getPropertyEquality(ax, bx, f).propertyDiffs).toEqual([PropertyDifference.META]);
    ctx.expect(PropertyUtil.getPropertyEquality(bz, cz, f).propertyDiffs).toEqual([PropertyDifference.META]);

    ctx.expect(PropertyUtil.getPropertyEquality(ax, cx, f).propertyDiffs).toEqual([]);

    ctx.expect(PropertyUtil.getPropertyEquality(ax, ax, f).propertyDiffs ?? []).toEqual([]);
  });
});

function addPrim(owner: OmniPropertyOwner, name: string, primitiveKind: OmniPrimitiveTangibleKind, description?: string): OmniProperty {

  return PropertyUtil.addProperty(owner, {
    kind: OmniItemKind.PROPERTY,
    type: {kind: primitiveKind},
    name: name,
    description: description,
  });
}
