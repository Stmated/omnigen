import {OmniType} from '@parse/OmniModel';
import {JSONSchema7} from 'json-schema';

// export type JsonRpcErrorDataSchemaType = OmniType | Record<string, unknown> | undefined;

export interface IParserOptions {

  relaxedLookup: boolean;
  relaxedPlaceholders: boolean;
  jsonRpcPropertyName?: string;
  jsonRpcVersion?: string;
  jsonRpcIdIncluded: boolean;
  jsonRpcErrorPropertyName?: string;
  jsonRpcErrorNameIncluded?: boolean;
  jsonRpcErrorDataSchema?: OmniType | JSONSchema7 | undefined;
  autoTypeHints: boolean;
}

type SemiRequired<T> = { [K in keyof Required<T>]: T[K] };

// export type IRequiredParserOptions = SemiRequired<IParserOptions>
//   & Omit<IParserOptions, 'jsonRpcErrorPropertyName'>
//   & Required<Pick<IParserOptions, 'jsonRpcErrorPropertyName'>>;

export type IRequiredParserOptions = SemiRequired<IParserOptions>
  & Omit<IParserOptions, 'jsonRpcErrorPropertyName' | 'jsonRpcErrorDataSchema'>
  & Required<Pick<IParserOptions, 'jsonRpcErrorPropertyName'>>
  & {jsonRpcErrorDataSchema: OmniType | undefined}
  ;

export const DEFAULT_PARSER_OPTIONS: IParserOptions = {

  // TODO: This should be 'false', but we keep it as this for the sake of easy testing.
  relaxedLookup: true,
  relaxedPlaceholders: true,
  // jsonRpcPropertyName: undefined,
  // jsonRpcErrorPropertyName: undefined,
  // jsonRpcErrorNameIncluded: undefined,
  // jsonRpcVersion: undefined,
  jsonRpcIdIncluded: true,
  // jsonRpcErrorSchema: undefined,
  autoTypeHints: true,
}

