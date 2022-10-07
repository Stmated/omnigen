import {CompositionUtil, OmniPrimitiveKind, OmniTypeKind} from '../parse';

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
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.NUMBER
    }]);

    // expect(result).toBeDefined();
    // expect(result.kind).toEqual(OmniTypeKind.PRIMITIVE);
  });

  test('Merging primitive allOf composition type', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType([], [
      // This is invalid, it is not possible to be a Number AND String, but this method should not validate.
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING}
    ]);

    // assert(result);
    // assert(result.kind == OmniTypeKind.COMPOSITION);
    // assert(result.compositionKind == CompositionKind.AND);
    // assert(result.andTypes.length == 2);
    // assert(result.andTypes[0].kind == OmniTypeKind.PRIMITIVE);
    // assert(result.andTypes[1].kind == OmniTypeKind.PRIMITIVE);
  });

  test('allOf1+anyOf1', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [{kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING}],
      [{kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER}]
    );

    // assert(result);
    // assert(result.kind == OmniTypeKind.COMPOSITION);
    // assert(result.compositionKind == CompositionKind.AND);
    // assert(result.andTypes.length == 2);
    // assert(result.andTypes[0].kind == OmniTypeKind.PRIMITIVE);
    // assert(result.andTypes[1].kind == OmniTypeKind.PRIMITIVE);
  });

  test('allOf1+anyOf2', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL}
      ],
      [{kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER}]
    );

    // assert(result);
    // assert(result.kind == OmniTypeKind.COMPOSITION);
    // assert(result.compositionKind == CompositionKind.AND);
    // assert(result.andTypes.length == 2);
    // assert(result.andTypes[0].kind == OmniTypeKind.COMPOSITION);
    // assert(result.andTypes[0].compositionKind == CompositionKind.OR);
    // assert(result.andTypes[0].orTypes.length == 2);
    // assert(result.andTypes[1].kind == OmniTypeKind.PRIMITIVE);
  });

  test('allOf1+oneOf2', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [],
      [{kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER}],
      [
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL}
      ]
    );

    // assert(result);
    // assert(result.kind == OmniTypeKind.COMPOSITION);
    // assert(result.compositionKind == CompositionKind.AND);
    // assert(result.andTypes.length == 2);
    // assert(result.andTypes[0].kind == OmniTypeKind.PRIMITIVE);
    // assert(result.andTypes[1].kind == OmniTypeKind.COMPOSITION);
    // assert(result.andTypes[1].compositionKind == CompositionKind.XOR);
    // assert(result.andTypes[1].xorTypes.length == 2);
  });

  test('allOf1+oneOf2+not', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [],
      [{kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER}],
      [
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL}
      ],
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.FLOAT}
    );

    // assert(result);
    // assert(result.kind == OmniTypeKind.COMPOSITION);
    // assert(result.compositionKind == CompositionKind.AND);
    // assert(result.andTypes.length == 2);
    // assert(result.andTypes[0].kind == OmniTypeKind.COMPOSITION);
    // assert(result.andTypes[0].compositionKind == CompositionKind.AND);
    // assert(result.andTypes[0].andTypes[0].kind == OmniTypeKind.PRIMITIVE);
    // assert(result.andTypes[0].andTypes[1].kind == OmniTypeKind.COMPOSITION);
    // assert(result.andTypes[0].andTypes[1].compositionKind == CompositionKind.XOR);
    // assert(result.andTypes[0].andTypes[1].xorTypes.length == 2);
    // assert(result.andTypes[0].andTypes[1].xorTypes[0].kind == OmniTypeKind.PRIMITIVE);
    // assert(result.andTypes[0].andTypes[1].xorTypes[1].kind == OmniTypeKind.PRIMITIVE);
    // assert(result.andTypes[1].kind == OmniTypeKind.COMPOSITION);
    // assert(result.andTypes[1].compositionKind == CompositionKind.NOT);
    // assert(result.andTypes[1].notTypes.length == 1);
  });
});
