import {Booleanish, IncomingOrRealOption, RealOptions, OptionConverters, OptionsUtil, Options} from '../options';

export interface ParserOptions extends Options {
  relaxedLookup: IncomingOrRealOption<Booleanish, boolean>;
  relaxedPlaceholders: IncomingOrRealOption<Booleanish, boolean>;
  autoTypeHints: IncomingOrRealOption<Booleanish, boolean>;
  relaxedUnknownTypes: IncomingOrRealOption<Booleanish, boolean>;
}

export const DEFAULT_PARSER_OPTIONS: RealOptions<ParserOptions> = {
  // TODO: This should be 'false', but we keep it as this for the sake of easy testing.
  relaxedLookup: true,
  relaxedPlaceholders: true,
  autoTypeHints: true,
  relaxedUnknownTypes: false,
};

export const PARSER_OPTIONS_CONVERTERS: OptionConverters<ParserOptions> = {
  autoTypeHints: OptionsUtil.toBoolean,
  relaxedLookup: OptionsUtil.toBoolean,
  relaxedPlaceholders: OptionsUtil.toBoolean,
  relaxedUnknownTypes: OptionsUtil.toBoolean,
};
