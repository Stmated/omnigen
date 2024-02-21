import {ZodCoercedBoolean, ZodOptions} from '@omnigen/core';
import {z} from 'zod';

export const ZodRunOptions = ZodOptions.extend({

  schemaDirBase: z.string().default('./'),
  schemaDirRecursive: ZodCoercedBoolean.default('t'),
  schemaPatternInclude: z.string().default(`/^.*\\.(?:json|ya?ml)$/`).transform(v => v ? new RegExp(v) : undefined),
  schemaPatternExclude: z.string().transform(v => v ? new RegExp(v) : undefined),
  failSilently: ZodCoercedBoolean.default('f'),
});

export type RunOptions = z.output<typeof ZodRunOptions>;


