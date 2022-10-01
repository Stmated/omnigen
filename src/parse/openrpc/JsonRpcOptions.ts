import {OmniType} from '@parse';
import {JSONSchema7} from 'json-schema';
import {Booleanish, IncomingOrRealOption, RealOptions} from '@options';

export type JsonRpcVersion = '1.0' | '1.1' | '2.0';

export interface IJsonRpcOptions {
  jsonRpcPropertyName: string | undefined;
  jsonRpcVersion: IncomingOrRealOption<JsonRpcVersion | undefined, JsonRpcVersion>;
  jsonRpcIdIncluded: IncomingOrRealOption<Booleanish, boolean>;
  jsonRpcErrorPropertyName: string;
  jsonRpcErrorNameIncluded: IncomingOrRealOption<Booleanish, boolean>;
  jsonRpcErrorDataSchema: IncomingOrRealOption<JSONSchema7 | undefined, OmniType | undefined>;
}

// export const DEFAULT_JSONRPC_OPTIONS: RealOptions<Omit<IJsonRpcOptions, 'jsonRpcVersion'>> = {
//   jsonRpcPropertyName: undefined,
//   // jsonRpcIdIncluded: false,
//   // jsonRpcErrorPropertyName: 'error',
//   // jsonRpcErrorNameIncluded: true,
//   // jsonRpcErrorDataSchema: undefined,
// };

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
