import {test, describe} from 'vitest';
import {ZodModelTransformOptions, ZodOptions, ZodTargetOptions} from '@omnigen/api';
import {z} from 'zod';
import {Compat, ZodUtils} from './ZodUtils.ts';

describe('type comparisons', () => {

  test.concurrent('same', ctx => {
    ctx.expect(ZodUtils.isCompatibleWith(ZodTargetOptions, ZodTargetOptions).v).toEqual(Compat.SAME);
  });

  test.concurrent('supertype supports subtype', ctx => {
    ctx.expect(ZodUtils.isCompatibleWith(ZodOptions, ZodTargetOptions).v).toEqual(Compat.SAME);
  });

  test.concurrent('subtype does not support supertype', ctx => {
    ctx.expect(ZodUtils.isCompatibleWith(ZodTargetOptions, ZodOptions).v).toEqual(Compat.DIFF);
  });

  test.concurrent('one supported by union', ctx => {
    ctx.expect(ZodUtils.isCompatibleWith(ZodTargetOptions, ZodModelTransformOptions.or(ZodTargetOptions)).v).toEqual(Compat.SAME);
  });

  test.concurrent('one supported by merge', ctx => {
    ctx.expect(ZodUtils.isCompatibleWith(ZodTargetOptions, ZodModelTransformOptions.merge(ZodTargetOptions)).v).toEqual(Compat.SAME);
  });

  test.concurrent('one supported by intersection', ctx => {
    const intersection = ZodModelTransformOptions.and(ZodTargetOptions);
    ctx.expect(ZodUtils.isCompatibleWith(ZodTargetOptions, intersection).v).toEqual(Compat.SAME);
    ctx.expect(ZodUtils.isCompatibleWith(ZodTargetOptions, intersection).v).toEqual(Compat.SAME);
  });

  test.concurrent('base type supported by literal', ctx => {
    ctx.expect(
      ZodUtils.isCompatibleWith(
        z.object({value: z.string()}),
        z.object({value: z.literal('string')}),
      ).v,
    ).toEqual(Compat.SAME);
  });

  test.concurrent('literal vs base type needs runtime eval', ctx => {
    ctx.expect(
      ZodUtils.isCompatibleWith(
        z.object({value: z.literal('string')}),
        z.object({value: z.string()}),
      ).v,
    ).toEqual(Compat.NEEDS_EVALUATION);
  });
});
