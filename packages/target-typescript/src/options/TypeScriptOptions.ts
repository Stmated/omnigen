import {ZodCoercedBoolean, ZodOptions} from '@omnigen/core';
import {z} from 'zod';

export const ZodTypeScriptOptions = ZodOptions.extend({

  tsStrict: ZodCoercedBoolean.default('t'),
  preferSingleQuoteStrings: ZodCoercedBoolean.default('t'),
  explicitReturns: ZodCoercedBoolean.default('f'),
  preferInterfaces: ZodCoercedBoolean.default('t'),
  importWithExtension: z.union([z.string(), z.undefined()]).default('ts'),
  strictUndefined: ZodCoercedBoolean.default('f'),
  singleFile: ZodCoercedBoolean.default('t'),
});

export type TypeScriptOptions = z.infer<typeof ZodTypeScriptOptions>;
