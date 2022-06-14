
export interface IParserOptions {

  relaxedLookup: boolean;
}

export const DEFAULT_PARSER_OPTIONS: IParserOptions = {

  // TODO: This should be 'false', but we keep it as this for the sake of easy testing.
  relaxedLookup: true,
}
