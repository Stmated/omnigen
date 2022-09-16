
export interface IParserOptions {

  relaxedLookup: boolean;
  relaxedPlaceholders: boolean;
  jsonRpcPropertyName: string | undefined;
  jsonRpcRequestVersion: string;
  jsonRpcIdIncluded: boolean;
  autoTypeHints: boolean;
}

export const DEFAULT_PARSER_OPTIONS: IParserOptions = {

  // TODO: This should be 'false', but we keep it as this for the sake of easy testing.
  relaxedLookup: true,
  relaxedPlaceholders: true,
  jsonRpcPropertyName: 'jsonrpc',
  jsonRpcRequestVersion: "2.0",
  jsonRpcIdIncluded: true,
  autoTypeHints: true,
}

export const JSONRPC_10_PARSER_OPTIONS: IParserOptions = {
  ...DEFAULT_PARSER_OPTIONS,
  ...{
    jsonRpcPropertyName: undefined,
    jsonRpcRequestVersion: "1.0",
    jsonRpcIdIncluded: false,
  }
};

export const JSONRPC_11_PARSER_OPTIONS: IParserOptions = {
  ...DEFAULT_PARSER_OPTIONS,
  ...{
    jsonRpcPropertyName: 'version',
    jsonRpcRequestVersion: "1.1",
    jsonRpcIdIncluded: false,
  }
};

export const JSONRPC_20_PARSER_OPTIONS: IParserOptions = {
  ...DEFAULT_PARSER_OPTIONS,
  ...{
    jsonRpcPropertyName: 'jsonrpc',
    jsonRpcRequestVersion: "2.0",
    jsonRpcIdIncluded: false,
  }
};
