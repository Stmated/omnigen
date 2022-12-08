import {
  OmniObjectType,
  OmniPrimitiveKind,
  OmniPrimitiveTangibleKind,
  OmniProperty,
  OmniPropertyOwner,
  OmniTypeKind,
} from './OmniModel.js';
import {PropertyUtil} from './PropertyUtil.js';
import {OMNI_GENERIC_FEATURES} from '../interpret/index.js';
import {PropertyDifference, TypeDifference} from '../equality/index.js';

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

    const ax = addPrim(a, 'x', OmniPrimitiveKind.STRING, 'foo');
    const ay = addPrim(a, 'y', OmniPrimitiveKind.NUMBER);
    const az = addPrim(a, 'z', OmniPrimitiveKind.DOUBLE);

    const bx = addPrim(b, 'x', OmniPrimitiveKind.STRING);
    const by = addPrim(b, 'y', OmniPrimitiveKind.DOUBLE, 'bar');
    const bz = addPrim(b, 'z', OmniPrimitiveKind.DOUBLE);

    const cx = addPrim(c, 'x', OmniPrimitiveKind.STRING, 'foo');
    const cy = addPrim(c, 'y', OmniPrimitiveKind.INTEGER);
    const cz = addPrim(c, 'z', OmniPrimitiveKind.DOUBLE, 'baz');

    expect(PropertyUtil.getPropertyEquality(ax, ay, f).propertyDiffs).toEqual([PropertyDifference.NAME]);
    expect(PropertyUtil.getPropertyEquality(az, by, f).propertyDiffs).toEqual([PropertyDifference.NAME]);

    expect(PropertyUtil.getPropertyEquality(by, cy, f).typeDiffs).toEqual([TypeDifference.ISOMORPHIC_TYPE]);
    expect(PropertyUtil.getPropertyEquality(by, cy, f).propertyDiffs).toEqual([PropertyDifference.META]);

    expect(PropertyUtil.getPropertyEquality(ay, cy, f).typeDiffs).toEqual([TypeDifference.ISOMORPHIC_TYPE]);
    expect(PropertyUtil.getPropertyEquality(ay, cy, f).propertyDiffs).toEqual([]);

    expect(PropertyUtil.getPropertyEquality(ax, bx, f).propertyDiffs).toEqual([PropertyDifference.META]);
    expect(PropertyUtil.getPropertyEquality(bz, cz, f).propertyDiffs).toEqual([PropertyDifference.META]);

    expect(PropertyUtil.getPropertyEquality(ax, cx, f).propertyDiffs).toEqual([]);

    expect(PropertyUtil.getPropertyEquality(ax, ax, f).propertyDiffs ?? []).toEqual([]);
  });
});

function addPrim(owner: OmniPropertyOwner, name: string, primitiveKind: OmniPrimitiveTangibleKind, description?: string): OmniProperty {

  return PropertyUtil.addProperty(owner, {
    type: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: primitiveKind},
    name: name,
    description: description,
  });
}
