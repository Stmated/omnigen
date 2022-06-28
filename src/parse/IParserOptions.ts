
export interface IParserOptions {

  relaxedLookup: boolean;
  relaxedPlaceholders: boolean;
  jsonRpcPropertyName: string;
  jsonRpcRequestVersion: string;
  jsonRpcIdIncluded: boolean;
}

export const DEFAULT_PARSER_OPTIONS: IParserOptions = {

  // TODO: This should be 'false', but we keep it as this for the sake of easy testing.
  relaxedLookup: true,
  relaxedPlaceholders: true,
  jsonRpcPropertyName: 'jsonrpc',
  jsonRpcRequestVersion: "2.0",
  jsonRpcIdIncluded: true,
}
