import {
  OmniObjectType,
  OmniPrimitiveKind,
  OmniPrimitiveNonNullableKind,
  OmniProperty,
  OmniPropertyOwner,
  OmniTypeKind,
} from './OmniModel.js';
import {PropertyUtil} from './PropertyUtil.js';
import {EqualityLevel} from './EqualityLevel.js';

describe('Test PropertyUtil', () => {

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

    expect(PropertyUtil.getEqualityLevel(ax, ay).propertyEquality).toEqual(EqualityLevel.NOT_EQUAL_MIN);
    expect(PropertyUtil.getEqualityLevel(az, by).propertyEquality).toEqual(EqualityLevel.NOT_EQUAL_MIN);

    expect(PropertyUtil.getEqualityLevel(by, cy).typeEquality).toEqual(EqualityLevel.ISOMORPHIC_MIN);
    expect(PropertyUtil.getEqualityLevel(by, cy).propertyEquality).toEqual(EqualityLevel.FUNCTION_MAX);

    expect(PropertyUtil.getEqualityLevel(ay, cy).typeEquality).toEqual(EqualityLevel.SEMANTICS_MIN);
    expect(PropertyUtil.getEqualityLevel(ay, cy).propertyEquality).toEqual(EqualityLevel.CLONE_MAX);

    expect(PropertyUtil.getEqualityLevel(ax, bx).propertyEquality).toEqual(EqualityLevel.FUNCTION_MAX);
    expect(PropertyUtil.getEqualityLevel(bz, cz).propertyEquality).toEqual(EqualityLevel.FUNCTION_MAX);

    expect(PropertyUtil.getEqualityLevel(ax, cx).propertyEquality).toEqual(EqualityLevel.CLONE_MAX);

    expect(PropertyUtil.getEqualityLevel(ax, ax).propertyEquality).toEqual(EqualityLevel.IDENTITY_MAX);
  });
});

function addPrim(owner: OmniPropertyOwner, name: string, primitiveKind: OmniPrimitiveNonNullableKind, description?: string): OmniProperty {

  return PropertyUtil.addProperty(owner, {
    type: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: primitiveKind},
    name: name,
    description: description,
  });
}
