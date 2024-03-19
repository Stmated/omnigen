import {ZodCoercedBoolean, ZodOptions} from '@omnigen/core';
import {z} from 'zod';

export const ZodTypeScriptOptions = ZodOptions.extend({

  tsStrict: ZodCoercedBoolean.default('t'),
});

export type TypeScriptOptions = z.infer<typeof ZodTypeScriptOptions>;
