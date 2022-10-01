import {OmniType} from '@parse';
import {JSONSchema7} from 'json-schema';
import {Booleanish, IncomingOrRealOption, RealOptions} from '@options';
import {Additions, IncomingConverters, OptionsUtil} from '@options/OptionsUtil';

export type JsonRpcVersion = '1.0' | '1.1' | '2.0';

export interface IJsonRpcOptions {
  jsonRpcPropertyName: string | undefined;
  jsonRpcVersion: IncomingOrRealOption<JsonRpcVersion | undefined, JsonRpcVersion>;
  jsonRpcIdIncluded: IncomingOrRealOption<Booleanish | undefined, boolean>;
  jsonRpcErrorPropertyName: IncomingOrRealOption<string | undefined, string>;
  jsonRpcErrorNameIncluded: IncomingOrRealOption<Booleanish | undefined, boolean>;
  jsonRpcErrorDataSchema: IncomingOrRealOption<JSONSchema7 | undefined, OmniType | undefined>;
}

export const DEFAULT_JSONRPC_OPTIONS: IJsonRpcOptions = {
  jsonRpcVersion: undefined,
  jsonRpcPropertyName: undefined,
  jsonRpcIdIncluded: undefined,
  jsonRpcErrorPropertyName: undefined,
  jsonRpcErrorNameIncluded: undefined,
  jsonRpcErrorDataSchema: undefined,
};

export const JSONRPC_10_PARSER_OPTIONS: RealOptions<IJsonRpcOptions> = {
  jsonRpcVersion: "1.0",
  jsonRpcIdIncluded: false,
  jsonRpcPropertyName: undefined,
  jsonRpcErrorPropertyName: 'error',
  jsonRpcErrorNameIncluded: true,
  jsonRpcErrorDataSchema: undefined,
};

export const JSONRPC_11_PARSER_OPTIONS: RealOptions<IJsonRpcOptions> = {
  jsonRpcVersion: "1.1",
  jsonRpcIdIncluded: false,
  jsonRpcPropertyName: 'version',
  jsonRpcErrorPropertyName: 'error',
  jsonRpcErrorNameIncluded: true,
  jsonRpcErrorDataSchema: undefined,
};

export const JSONRPC_20_PARSER_OPTIONS: RealOptions<IJsonRpcOptions> = {
  jsonRpcVersion: "2.0",
  jsonRpcIdIncluded: false,
  jsonRpcPropertyName: 'jsonrpc',
  jsonRpcErrorPropertyName: 'data',
  jsonRpcErrorNameIncluded: false,
  jsonRpcErrorDataSchema: undefined,
};

export const JSONRPC_OPTIONS_CONVERTERS: IncomingConverters<IJsonRpcOptions> = {
  jsonRpcVersion: (v) => v || '2.0',
  jsonRpcErrorDataSchema: (v) => {

    // TODO: How do we solve this?
    return undefined;
  },
  jsonRpcErrorPropertyName: (v) => {
    if (v) {
      return v;
    }

    throw new Error(`There must be a JsonRpc version override given`);
  },
  jsonRpcErrorNameIncluded: OptionsUtil.toBoolean,
  jsonRpcIdIncluded: OptionsUtil.toBoolean,
}

export const JSONRPC_OPTIONS_FALLBACK: Additions<IJsonRpcOptions> = {
  jsonRpcVersion: (v) => {
    switch (v) {
      case '1.1': return JSONRPC_11_PARSER_OPTIONS;
      case '1.0': return JSONRPC_10_PARSER_OPTIONS;
      default: return JSONRPC_20_PARSER_OPTIONS;
    }
  }
};
