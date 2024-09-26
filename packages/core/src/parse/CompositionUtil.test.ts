import {OmniType, OmniTypeKind} from '@omnigen/api';
import {CompositionUtil} from './CompositionUtil';
import {describe, test} from 'vitest';

describe('Test Composition Types', () => {

  test.concurrent('Merging no composition types', async ctx => {
    const result = CompositionUtil.getCompositionOrExtensionType();
    ctx.expect(result).toBeUndefined();
  });

  test.concurrent('Merging empty composition types', async ctx => {
    const result = CompositionUtil.getCompositionOrExtensionType([], [], []);
    ctx.expect(result).toBeUndefined();
  });

  test.concurrent('Merge primitive 1', async ctx => {
    const result = CompositionUtil.getCompositionOrExtensionType([], [{
      kind: OmniTypeKind.NUMBER,
    }]);

    ctx.expect(result?.kind).toEqual(OmniTypeKind.NUMBER);
  });

  test.concurrent('Merge Number or String', async ctx => {
    const result = CompositionUtil.getCompositionOrExtensionType([], [
      // This is invalid, it is not possible to be a Number AND String, but this method should not validate.
      {kind: OmniTypeKind.NUMBER},
      {kind: OmniTypeKind.STRING},
    ]);

    if (!result) {
      throw new Error(`Should have a result`);
    }

    ctx.expect(result).toMatchObject<Partial<OmniType>>({
      kind: OmniTypeKind.INTERSECTION,
      types: [
        {kind: OmniTypeKind.NUMBER},
        {kind: OmniTypeKind.STRING},
      ],
    });
  });

  test.concurrent('allOf1+anyOf1', async ctx => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [{kind: OmniTypeKind.STRING}],
      [{kind: OmniTypeKind.NUMBER}],
    );

    ctx.expect(result).toMatchObject<Partial<OmniType>>({
      kind: OmniTypeKind.INTERSECTION,
      types: [
        {kind: OmniTypeKind.STRING},
        {kind: OmniTypeKind.NUMBER},
      ],
    });
  });

  test.concurrent('allOf1+anyOf2', async ctx => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [
        {kind: OmniTypeKind.STRING},
        {kind: OmniTypeKind.BOOL},
      ],
      [{kind: OmniTypeKind.NUMBER}],
    );

    ctx.expect(result).toMatchObject<Partial<OmniType>>({
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

  test.concurrent('allOf1+oneOf2', async ctx => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [],
      [{kind: OmniTypeKind.NUMBER}],
      [
        {kind: OmniTypeKind.STRING},
        {kind: OmniTypeKind.BOOL},
      ],
    );

    ctx.expect(result).toMatchObject<Partial<OmniType>>({
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

  test.concurrent('allOf1+oneOf2+not', async ctx => {
    const result = CompositionUtil.getCompositionOrExtensionType(
      [],
      [{kind: OmniTypeKind.NUMBER}],
      [
        {kind: OmniTypeKind.STRING},
        {kind: OmniTypeKind.BOOL},
      ],
      {kind: OmniTypeKind.FLOAT},
    );

    ctx.expect(result).toMatchObject<Partial<OmniType>>({
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
