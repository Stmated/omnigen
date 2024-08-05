import {OmniType, OmniTypeKind} from '@omnigen/api';
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
      kind: OmniTypeKind.NUMBER,
    }]);

    expect(result?.kind).toEqual(OmniTypeKind.NUMBER);
  });

  test('Merge Number or String', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType([], [
      // This is invalid, it is not possible to be a Number AND String, but this method should not validate.
      {kind: OmniTypeKind.NUMBER},
      {kind: OmniTypeKind.STRING},
    ]);

    if (!result) {
      throw new Error(`Should have a result`);
    }

    expect(result).toMatchObject<Partial<OmniType>>({
      kind: OmniTypeKind.INTERSECTION,
      types: [
        {kind: OmniTypeKind.NUMBER},
        {kind: OmniTypeKind.STRING},
      ],
    });
  });

  test('allOf1+anyOf1', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [{kind: OmniTypeKind.STRING}],
      [{kind: OmniTypeKind.NUMBER}],
    );

    expect(result).toMatchObject<Partial<OmniType>>({
      kind: OmniTypeKind.INTERSECTION,
      types: [
        {kind: OmniTypeKind.STRING},
        {kind: OmniTypeKind.NUMBER},
      ],
    });
  });

  test('allOf1+anyOf2', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [
        {kind: OmniTypeKind.STRING},
        {kind: OmniTypeKind.BOOL},
      ],
      [{kind: OmniTypeKind.NUMBER}],
    );

    expect(result).toMatchObject<Partial<OmniType>>({
      kind: OmniTypeKind.INTERSECTION,
      types: [
        {
          kind: OmniTypeKind.UNION,
          types: [
            {kind: OmniTypeKind.STRING},
            {kind: OmniTypeKind.BOOL},
          ],
        },
        {kind: OmniTypeKind.NUMBER},
      ],
    });
  });

  test('allOf1+oneOf2', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [],
      [{kind: OmniTypeKind.NUMBER}],
      [
        {kind: OmniTypeKind.STRING},
        {kind: OmniTypeKind.BOOL},
      ],
    );

    expect(result).toMatchObject<Partial<OmniType>>({
      kind: OmniTypeKind.INTERSECTION,
      types: [
        {kind: OmniTypeKind.NUMBER},
        {
          kind: OmniTypeKind.EXCLUSIVE_UNION,
          types: [
            {kind: OmniTypeKind.STRING},
            {kind: OmniTypeKind.BOOL},
          ],
        },
      ],
    });
  });

  test('allOf1+oneOf2+not', async () => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [],
      [{kind: OmniTypeKind.NUMBER}],
      [
        {kind: OmniTypeKind.STRING},
        {kind: OmniTypeKind.BOOL},
      ],
      {kind: OmniTypeKind.FLOAT},
    );

    expect(result).toMatchObject<Partial<OmniType>>({
      kind: OmniTypeKind.INTERSECTION,
      types: [
        {
          kind: OmniTypeKind.INTERSECTION,
          types: [
            {kind: OmniTypeKind.NUMBER},
            {
              kind: OmniTypeKind.EXCLUSIVE_UNION,
              types: [
                {kind: OmniTypeKind.STRING},
                {kind: OmniTypeKind.BOOL},
              ],
            },
          ],
        },
        {
          kind: OmniTypeKind.NEGATION,
          types: [
            {kind: OmniTypeKind.FLOAT},
          ],
        },
      ],
    });
  });
});
