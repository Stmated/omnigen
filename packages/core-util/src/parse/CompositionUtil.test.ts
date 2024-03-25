import {CompositionKind, OmniPrimitiveKind, OmniType, OmniTypeKind} from '@omnigen/core';
import {CompositionUtil} from './CompositionUtil';
import {describe, test, expect} from 'vitest';

describe('Test Composition Types', () => {

  test('Merging no composition types', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType();
    expect(result).toBeUndefined();
  });

  test('Merging empty composition types', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType([], [], []);
    expect(result).toBeUndefined();
  });

  test('Merge primitive 1', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType([], [{
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.NUMBER,
    }]);

    expect(result?.kind).toEqual(OmniTypeKind.PRIMITIVE);
  });

  test('Merge Number or String', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType([], [
      // This is invalid, it is not possible to be a Number AND String, but this method should not validate.
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
    ]);

    if (!result) {
      throw new Error(`Should have a result`);
    }

    expect(result).toMatchObject<Partial<OmniType>>({
      kind: OmniTypeKind.COMPOSITION,
      compositionKind: CompositionKind.INTERSECTION,
      types: [
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER},
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
      ],
    });
  });

  test('allOf1+anyOf1', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [{kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING}],
      [{kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER}],
    );

    expect(result).toMatchObject<Partial<OmniType>>({
      kind: OmniTypeKind.COMPOSITION,
      compositionKind: CompositionKind.INTERSECTION,
      types: [
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER},
      ],
    });
  });

  test('allOf1+anyOf2', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL},
      ],
      [{kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER}],
    );

    expect(result).toMatchObject<Partial<OmniType>>({
      kind: OmniTypeKind.COMPOSITION,
      compositionKind: CompositionKind.INTERSECTION,
      types: [
        {
          kind: OmniTypeKind.COMPOSITION, compositionKind: CompositionKind.UNION,
          types: [
            {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
            {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL},
          ],
        },
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER},
      ],
    });
  });

  test('allOf1+oneOf2', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [],
      [{kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER}],
      [
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL},
      ],
    );

    expect(result).toMatchObject<Partial<OmniType>>({
      kind: OmniTypeKind.COMPOSITION,
      compositionKind: CompositionKind.INTERSECTION,
      types: [
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER},
        {
          kind: OmniTypeKind.COMPOSITION, compositionKind: CompositionKind.EXCLUSIVE_UNION,
          types: [
            {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
            {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL},
          ],
        },
      ],
    });
  });

  test('allOf1+oneOf2+not', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [],
      [{kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER}],
      [
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
        {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL},
      ],
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.FLOAT},
    );

    expect(result).toMatchObject<Partial<OmniType>>({
      kind: OmniTypeKind.COMPOSITION,
      compositionKind: CompositionKind.INTERSECTION,
      types: [
        {
          kind: OmniTypeKind.COMPOSITION, compositionKind: CompositionKind.INTERSECTION,
          types: [
            {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER},
            {
              kind: OmniTypeKind.COMPOSITION, compositionKind: CompositionKind.EXCLUSIVE_UNION,
              types: [
                {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
                {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL},
              ],
            },
          ],
        },
        {
          kind: OmniTypeKind.COMPOSITION, compositionKind: CompositionKind.NEGATION,
          types: [
            {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.FLOAT},
          ],
        },
      ],
    });
  });
});
