import {
  ZodCoercedBoolean,
  ZodOptions,
} from '../options';
import {z} from 'zod';

export const ZodParserOptions = ZodOptions.extend({

  relaxedLookup: ZodCoercedBoolean.default('t'),
  relaxedPlaceholders: ZodCoercedBoolean.default('t'),
  autoTypeHints: ZodCoercedBoolean.default('t'),
  relaxedUnknownTypes: ZodCoercedBoolean.default('f'),
  trustedClients: ZodCoercedBoolean.default('f'),
  preferredWrapMode: ZodCoercedBoolean.default('f'),
});

export type IncomingParserOptions = z.input<typeof ZodParserOptions>;
export type ParserOptions = z.infer<typeof ZodParserOptions>;
export type UnknownParserOptions = IncomingParserOptions | ParserOptions;

export const DEFAULT_PARSER_OPTIONS: ParserOptions = ZodParserOptions.parse({});
