import {CompositionKind, GenericPrimitiveKind, GenericTypeKind, CompositionUtil} from '@parse';
import assert = require('assert');

describe('Test Composition Types', () => {

  test('Merging no composition types', async () => {
    const result = CompositionUtil.getCompositionType();
    expect(result).toBeUndefined();
  });

  test('Merging empty composition types', async () => {
    const result = CompositionUtil.getCompositionType([], [], []);
    expect(result).toBeUndefined();
  });

  test('Merging primitive allOf composition type', async () => {
    const result = CompositionUtil.getCompositionType([], [{
      name: 'a',
      kind: GenericTypeKind.PRIMITIVE,
      primitiveKind: GenericPrimitiveKind.NUMBER
    }]);

    assert(result);
    assert(result.kind == GenericTypeKind.PRIMITIVE);
  });

  test('Merging primitive allOf composition type', async () => {
    const result = CompositionUtil.getCompositionType([], [
      // This is invalid, it is not possible to be a Number AND String, but this method should not validate.
      {name: 'a', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.NUMBER},
      {name: 'b', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.STRING}
    ]);

    assert(result);
    assert(result.kind == GenericTypeKind.COMPOSITION);
    assert(result.compositionKind == CompositionKind.AND);
    assert(result.types.length == 2);
    assert(result.types[0].kind == GenericTypeKind.PRIMITIVE);
    assert(result.types[1].kind == GenericTypeKind.PRIMITIVE);
  });

  test('allOf1+anyOf1', async () => {
    const result = CompositionUtil.getCompositionType(
      [{name: 'a', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.STRING}],
      [{name: 'b', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.NUMBER}]
    );

    assert(result);
    assert(result.kind == GenericTypeKind.COMPOSITION);
    assert(result.compositionKind == CompositionKind.AND);
    assert(result.types.length == 2);
    assert(result.types[0].kind == GenericTypeKind.PRIMITIVE);
    assert(result.types[1].kind == GenericTypeKind.PRIMITIVE);
  });

  test('allOf1+anyOf2', async () => {
    const result = CompositionUtil.getCompositionType(
      [
        {name: 'a', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.STRING},
        {name: 'b', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.BOOL}
      ],
      [{name: 'c', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.NUMBER}]
    );

    assert(result);
    assert(result.kind == GenericTypeKind.COMPOSITION);
    assert(result.compositionKind == CompositionKind.AND);
    assert(result.types.length == 2);
    assert(result.types[0].kind == GenericTypeKind.COMPOSITION);
    assert(result.types[0].types.length == 2);
    assert(result.types[0].compositionKind == CompositionKind.OR);
    assert(result.types[1].kind == GenericTypeKind.PRIMITIVE);
  });

  test('allOf1+oneOf2', async () => {
    const result = CompositionUtil.getCompositionType(
      [],
      [{name: 'a', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.NUMBER}],
      [
        {name: 'b', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.STRING},
        {name: 'c', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.BOOL}
      ]
    );

    assert(result);
    assert(result.kind == GenericTypeKind.COMPOSITION);
    assert(result.compositionKind == CompositionKind.AND);
    assert(result.types.length == 2);
    assert(result.types[0].kind == GenericTypeKind.PRIMITIVE);
    assert(result.types[1].kind == GenericTypeKind.COMPOSITION);
    assert(result.types[1].types.length == 2);
    assert(result.types[1].compositionKind == CompositionKind.XOR);
  });

  test('allOf1+oneOf2+not', async () => {
    const result = CompositionUtil.getCompositionType(
      [],
      [{name: 'a', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.NUMBER}],
      [
        {name: 'b', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.STRING},
        {name: 'c', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.BOOL}
      ],
      {name: 'd', kind: GenericTypeKind.PRIMITIVE, primitiveKind: GenericPrimitiveKind.FLOAT}
    );

    assert(result);
    assert(result.kind == GenericTypeKind.COMPOSITION);
    assert(result.compositionKind == CompositionKind.AND);
    assert(result.types.length == 2);
    assert(result.types[0].kind == GenericTypeKind.COMPOSITION);
    assert(result.types[0].types[0].kind == GenericTypeKind.PRIMITIVE);
    assert(result.types[0].types[1].kind == GenericTypeKind.COMPOSITION);
    assert(result.types[0].types[1].types.length == 2);
    assert(result.types[0].types[1].types[0].kind == GenericTypeKind.PRIMITIVE);
    assert(result.types[0].types[1].types[1].kind == GenericTypeKind.PRIMITIVE);
    assert(result.types[1].kind == GenericTypeKind.COMPOSITION);
    assert(result.types[1].compositionKind == CompositionKind.NOT);
    assert(result.types[1].types.length == 1);
  });
});
