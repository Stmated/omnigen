import {ZodCoercedBoolean} from '@omnigen/core';
import {z} from 'zod';
import {ZodCodeOptions} from '@omnigen/target-code';

export const ZodTypeScriptOptions = ZodCodeOptions.extend({

  tsStrict: ZodCoercedBoolean.default('t'),
  preferSingleQuoteStrings: ZodCoercedBoolean.default('t'),
  explicitReturns: ZodCoercedBoolean.default('f'),
  preferInterfaces: ZodCoercedBoolean.default('t'),
  importWithExtension: z.union([z.string(), z.undefined()]).default('ts'),
  strictUndefined: ZodCoercedBoolean.default('f'),
  singleFile: ZodCoercedBoolean.default('t'),
  singleFileName: z.string().optional(),
});

export type TypeScriptOptions = z.infer<typeof ZodTypeScriptOptions>;
