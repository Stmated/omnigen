import {CompositionKind, OmniPrimitiveKind, OmniTypeKind, CompositionUtil} from '@parse';
import assert = require('assert');

describe('Test Composition Types', () => {

  test('Merging no composition types', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType();
    expect(result).toBeUndefined();
  });

  test('Merging empty composition types', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType([], [], []);
    expect(result).toBeUndefined();
  });

  test('Merging primitive allOf composition type', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType([], [{
      name: 'a',
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.NUMBER
    }]);

    assert(result);
    assert(result.kind == OmniTypeKind.PRIMITIVE);
  });

  test('Merging primitive allOf composition type', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType([], [
      // This is invalid, it is not possible to be a Number AND String, but this method should not validate.
      {name: 'a', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER},
      {name: 'b', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING}
    ]);

    assert(result);
    assert(result.kind == OmniTypeKind.COMPOSITION);
    assert(result.compositionKind == CompositionKind.AND);
    assert(result.types.length == 2);
    assert(result.types[0].kind == OmniTypeKind.PRIMITIVE);
    assert(result.types[1].kind == OmniTypeKind.PRIMITIVE);
  });

  test('allOf1+anyOf1', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [{name: 'a', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING}],
      [{name: 'b', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER}]
    );

    assert(result);
    assert(result.kind == OmniTypeKind.COMPOSITION);
    assert(result.compositionKind == CompositionKind.AND);
    assert(result.types.length == 2);
    assert(result.types[0].kind == OmniTypeKind.PRIMITIVE);
    assert(result.types[1].kind == OmniTypeKind.PRIMITIVE);
  });

  test('allOf1+anyOf2', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [
        {name: 'a', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
        {name: 'b', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL}
      ],
      [{name: 'c', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER}]
    );

    assert(result);
    assert(result.kind == OmniTypeKind.COMPOSITION);
    assert(result.compositionKind == CompositionKind.AND);
    assert(result.types.length == 2);
    assert(result.types[0].kind == OmniTypeKind.COMPOSITION);
    assert(result.types[0].types.length == 2);
    assert(result.types[0].compositionKind == CompositionKind.OR);
    assert(result.types[1].kind == OmniTypeKind.PRIMITIVE);
  });

  test('allOf1+oneOf2', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [],
      [{name: 'a', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER}],
      [
        {name: 'b', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
        {name: 'c', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL}
      ]
    );

    assert(result);
    assert(result.kind == OmniTypeKind.COMPOSITION);
    assert(result.compositionKind == CompositionKind.AND);
    assert(result.types.length == 2);
    assert(result.types[0].kind == OmniTypeKind.PRIMITIVE);
    assert(result.types[1].kind == OmniTypeKind.COMPOSITION);
    assert(result.types[1].types.length == 2);
    assert(result.types[1].compositionKind == CompositionKind.XOR);
  });

  test('allOf1+oneOf2+not', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [],
      [{name: 'a', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER}],
      [
        {name: 'b', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
        {name: 'c', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL}
      ],
      {name: 'd', kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.FLOAT}
    );

    assert(result);
    assert(result.kind == OmniTypeKind.COMPOSITION);
    assert(result.compositionKind == CompositionKind.AND);
    assert(result.types.length == 2);
    assert(result.types[0].kind == OmniTypeKind.COMPOSITION);
    assert(result.types[0].types[0].kind == OmniTypeKind.PRIMITIVE);
    assert(result.types[0].types[1].kind == OmniTypeKind.COMPOSITION);
    assert(result.types[0].types[1].types.length == 2);
    assert(result.types[0].types[1].types[0].kind == OmniTypeKind.PRIMITIVE);
    assert(result.types[0].types[1].types[1].kind == OmniTypeKind.PRIMITIVE);
    assert(result.types[1].kind == OmniTypeKind.COMPOSITION);
    assert(result.types[1].compositionKind == CompositionKind.NOT);
    assert(result.types[1].types.length == 1);
  });
});
