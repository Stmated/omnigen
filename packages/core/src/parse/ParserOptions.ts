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

  /**
   * NOTE: `false` is not correct according to JsonSchema standard.
   *
   * TODO: Either we do not care, or we introduce a "strict" mode (and other modes) which can set other default values
   *        Maybe we should have some kind of global repository which we initialize, and fetch the default settings from? Would be global per run though...
   */
  defaultAdditionalProperties: ZodCoercedBoolean.default('f'),
});

export type IncomingParserOptions = z.input<typeof ZodParserOptions>;
export type ParserOptions = z.infer<typeof ZodParserOptions>;
export type UnknownParserOptions = IncomingParserOptions | ParserOptions;

export const DEFAULT_PARSER_OPTIONS: ParserOptions = ZodParserOptions.parse({});
