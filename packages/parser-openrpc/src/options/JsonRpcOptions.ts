import {JSONSchema7} from 'json-schema';
import {
  OmniType,
  Booleanish,
  IncomingOrRealOption,
  RealOptions,
  OptionAdditions,
  OptionConverters,
  OptionsUtil,
  Options,
} from '@omnigen/core';

export type JsonRpcVersion = '1.0' | '1.1' | '2.0';

export interface JsonRpcOptions extends Options {
  jsonRpcPropertyName: string | undefined;
  jsonRpcVersion: IncomingOrRealOption<JsonRpcVersion | undefined, JsonRpcVersion>;
  jsonRpcIdIncluded: IncomingOrRealOption<Booleanish | undefined, boolean>;
  jsonRpcErrorPropertyName: IncomingOrRealOption<string | undefined, string>;
  jsonRpcErrorNameIncluded: IncomingOrRealOption<Booleanish | undefined, boolean>;
  jsonRpcErrorDataSchema: IncomingOrRealOption<JSONSchema7 | undefined, OmniType | undefined>;
}

export const DEFAULT_JSONRPC_OPTIONS: JsonRpcOptions = {
  jsonRpcVersion: undefined,
  jsonRpcPropertyName: undefined,
  jsonRpcIdIncluded: undefined,
  jsonRpcErrorPropertyName: undefined,
  jsonRpcErrorNameIncluded: undefined,
  jsonRpcErrorDataSchema: undefined,
};

export const JSONRPC_10_PARSER_OPTIONS: RealOptions<JsonRpcOptions> = {
  jsonRpcVersion: '1.0',
  jsonRpcIdIncluded: false,
  jsonRpcPropertyName: undefined,
  jsonRpcErrorPropertyName: 'error',
  jsonRpcErrorNameIncluded: true,
  jsonRpcErrorDataSchema: undefined,
};

export const JSONRPC_11_PARSER_OPTIONS: RealOptions<JsonRpcOptions> = {
  jsonRpcVersion: '1.1',
  jsonRpcIdIncluded: false,
  jsonRpcPropertyName: 'version',
  jsonRpcErrorPropertyName: 'error',
  jsonRpcErrorNameIncluded: true,
  jsonRpcErrorDataSchema: undefined,
};

export const JSONRPC_20_PARSER_OPTIONS: RealOptions<JsonRpcOptions> = {
  jsonRpcVersion: '2.0',
  jsonRpcIdIncluded: false,
  jsonRpcPropertyName: 'jsonrpc',
  jsonRpcErrorPropertyName: 'data',
  jsonRpcErrorNameIncluded: false,
  jsonRpcErrorDataSchema: undefined,
};

export const JSONRPC_OPTIONS_CONVERTERS: OptionConverters<JsonRpcOptions> = {
  jsonRpcVersion: v => Promise.resolve(v || '2.0'),
  jsonRpcErrorDataSchema: async v => {

    if (!v || 'kind' in v) {
      return Promise.resolve(v);
    }

    return Promise.resolve(undefined);
  },
  jsonRpcErrorPropertyName: v => {
    if (v) {
      return Promise.resolve(v);
    }

    throw new Error(`There must be a JsonRpc version override given`);
  },
  jsonRpcErrorNameIncluded: OptionsUtil.toBoolean,
  jsonRpcIdIncluded: OptionsUtil.toBoolean,
};

export const JSONRPC_OPTIONS_FALLBACK: OptionAdditions<JsonRpcOptions> = {
  jsonRpcVersion: v => {
    switch (v) {
      case '1.1':
        return JSONRPC_11_PARSER_OPTIONS;
      case '1.0':
        return JSONRPC_10_PARSER_OPTIONS;
      default:
        return JSONRPC_20_PARSER_OPTIONS;
    }
  },
};
