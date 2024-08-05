import {expect, test, describe} from 'vitest';
import {ZodModelTransformOptions, ZodOptions, ZodTargetOptions} from '@omnigen/api';
import {z} from 'zod';
import {Compat, ZodUtils} from './ZodUtils.ts';

describe('type comparisons', () => {

  test('same', () => {
    expect(ZodUtils.isCompatibleWith(ZodTargetOptions, ZodTargetOptions).v).toEqual(Compat.SAME);
  });

  test('supertype supports subtype', () => {
    expect(ZodUtils.isCompatibleWith(ZodOptions, ZodTargetOptions).v).toEqual(Compat.SAME);
  });

  test('subtype does not support supertype', () => {
    expect(ZodUtils.isCompatibleWith(ZodTargetOptions, ZodOptions).v).toEqual(Compat.DIFF);
  });

  test('one supported by union', () => {
    expect(ZodUtils.isCompatibleWith(ZodTargetOptions, ZodModelTransformOptions.or(ZodTargetOptions)).v).toEqual(Compat.SAME);
  });

  test('one supported by merge', () => {
    expect(ZodUtils.isCompatibleWith(ZodTargetOptions, ZodModelTransformOptions.merge(ZodTargetOptions)).v).toEqual(Compat.SAME);
  });

  test('one supported by intersection', () => {
    const intersection = ZodModelTransformOptions.and(ZodTargetOptions);
    expect(ZodUtils.isCompatibleWith(ZodTargetOptions, intersection).v).toEqual(Compat.SAME);
    expect(ZodUtils.isCompatibleWith(ZodTargetOptions, intersection).v).toEqual(Compat.SAME);
  });

  test('base type supported by literal', () => {
    expect(
      ZodUtils.isCompatibleWith(
        z.object({value: z.string()}),
        z.object({value: z.literal('string')}),
      ).v,
    ).toEqual(Compat.SAME);
  });

  test('literal vs base type needs runtime eval', () => {
    expect(
      ZodUtils.isCompatibleWith(
        z.object({value: z.literal('string')}),
        z.object({value: z.string()}),
      ).v,
    ).toEqual(Compat.NEEDS_EVALUATION);
  });
});
