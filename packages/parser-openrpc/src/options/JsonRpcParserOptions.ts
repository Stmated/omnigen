import {OmniType, ZodCoercedBoolean, ZodOptions} from '@omnigen/api';
import {z} from 'zod';
import {JSONSchema9} from '@omnigen/parser-jsonschema';

export const ZodJsonRpcParserOptionsBase = ZodOptions.extend({
  jsonRpcRequestParamsTypeName: z.string().default('JsonRpcRequestParams'),
  jsonRpcCallbackParamsTypeName: z.string().default('JsonRpcCallbackParams'),

  jsonRpcRequestTypeName: z.string().default('JsonRpcRequest'),
  jsonRpcCallbackTypeName: z.string().default('JsonRpcCallback'),

  jsonRpcRequestMethodTypeSuffix: z.string().default('Request'),
  jsonRpcCallbackMethodTypeSuffix: z.string().default('Request'),

  jsonRpcResultRequired: ZodCoercedBoolean.default('true'),

  jsonRpcErrorDataSchema: z.union([z.custom<JSONSchema9>(), z.custom<OmniType>()]).optional()
    .transform((v, ctx) => {

      if (!v || 'kind' in v) {
        return v;
      }

      return v;
    }),
});

export const ZodJsonRpc10ParserOptions = ZodJsonRpcParserOptionsBase.extend({
  jsonRpcPropertyName: z.string().optional(),
  jsonRpcIdIncluded: ZodCoercedBoolean.default('true'),
  jsonRpcIdRequired: ZodCoercedBoolean.default('true'),
  jsonRpcErrorPropertyName: z.string().default('error'),
  jsonRpcErrorNameIncluded: ZodCoercedBoolean.default('true'),
});
export const ZodJsonRpc11ParserOptions = ZodJsonRpcParserOptionsBase.extend({
  jsonRpcPropertyName: z.string().optional().default('version'),
  jsonRpcIdIncluded: ZodCoercedBoolean.default('true'),
  jsonRpcIdRequired: ZodCoercedBoolean.default('false'),
  jsonRpcErrorPropertyName: z.string().default('error'),
  jsonRpcErrorNameIncluded: ZodCoercedBoolean.default('true'),
});
export const ZodJsonRpc20ParserOptions = ZodJsonRpcParserOptionsBase.extend({
  jsonRpcPropertyName: z.string().optional().default('jsonrpc'),
  jsonRpcIdIncluded: ZodCoercedBoolean.default('true'),
  jsonRpcIdRequired: ZodCoercedBoolean.default('false'),
  jsonRpcErrorPropertyName: z.string().default('data'),
  jsonRpcErrorNameIncluded: ZodCoercedBoolean.default('false'),
});

export const ZodJsonRpcParserOptions = z.discriminatedUnion('jsonRpcVersion', [
  ZodJsonRpc20ParserOptions.extend({jsonRpcVersion: z.literal('2.0')}),
  ZodJsonRpc11ParserOptions.extend({jsonRpcVersion: z.literal('1.1')}),
  ZodJsonRpc10ParserOptions.extend({jsonRpcVersion: z.literal('1.0')}),
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
