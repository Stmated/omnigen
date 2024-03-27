// import {JSONSchema6, JSONSchema7} from 'json-schema';
import {OmniType, ZodCoercedBoolean, ZodOptions} from '@omnigen/core';
import {z} from 'zod';
import {JSONSchema9} from '@omnigen/parser-jsonschema';

export const ZodJsonRpcParserOptionsBase = ZodOptions.extend({
  jsonRpcErrorDataSchema: z.union([z.custom<JSONSchema9>(), z.custom<OmniType>()]).optional()
    .transform((v, ctx) => {

      if (!v || 'kind' in v) {
        return v;
      }

      return v;
    }),
});

export const ZodJsonRpc10ParserOptions = ZodJsonRpcParserOptionsBase.extend({
  jsonRpcVersion: z.literal('1.0').default('1.0'),
  jsonRpcPropertyName: z.string().optional(),
  jsonRpcIdIncluded: ZodCoercedBoolean.default('true'),
  jsonRpcErrorPropertyName: z.string().default('error'),
  jsonRpcErrorNameIncluded: ZodCoercedBoolean.default('true'),
});
export const ZodJsonRpc11ParserOptions = ZodJsonRpcParserOptionsBase.extend({
  jsonRpcVersion: z.literal('1.1').default('1.1'),
  jsonRpcPropertyName: z.string().optional().default('version'),
  jsonRpcIdIncluded: ZodCoercedBoolean.default('true'),
  jsonRpcErrorPropertyName: z.string().default('error'),
  jsonRpcErrorNameIncluded: ZodCoercedBoolean.default('true'),
});
export const ZodJsonRpc20ParserOptions = ZodJsonRpcParserOptionsBase.extend({
  jsonRpcVersion: z.literal('2.0').default('2.0'),
  jsonRpcPropertyName: z.string().optional().default('jsonrpc'),
  jsonRpcIdIncluded: ZodCoercedBoolean.default('true'),
  jsonRpcErrorPropertyName: z.string().default('data'),
  jsonRpcErrorNameIncluded: ZodCoercedBoolean.default('false'),
});

export const ZodJsonRpcParserOptions = z.union([
  ZodJsonRpc20ParserOptions,
  ZodJsonRpc11ParserOptions,
  ZodJsonRpc10ParserOptions,
]);

export type IncomingJsonRpcParserOptions = z.input<typeof ZodJsonRpcParserOptions>;
export type JsonRpcParserOptions = z.output<typeof ZodJsonRpcParserOptions>;
export type JsonRpc10ParserOptions = z.output<typeof ZodJsonRpc10ParserOptions>;
export type JsonRpc11ParserOptions = z.output<typeof ZodJsonRpc11ParserOptions>;
export type JsonRpc20ParserOptions = z.output<typeof ZodJsonRpc20ParserOptions>;
export type JsonRpcVersion = JsonRpcParserOptions['jsonRpcVersion'];

export const DEFAULT_JSONRPC20_PARSER_OPTIONS: Readonly<JsonRpc20ParserOptions> = ZodJsonRpc20ParserOptions.parse({});
export const DEFAULT_JSONRPC11_PARSER_OPTIONS: Readonly<JsonRpc11ParserOptions> = ZodJsonRpc11ParserOptions.parse({});
export const DEFAULT_JSONRPC10_PARSER_OPTIONS: Readonly<JsonRpc10ParserOptions> = ZodJsonRpc10ParserOptions.parse({});
