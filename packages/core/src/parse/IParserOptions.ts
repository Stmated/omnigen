import {Booleanish, IncomingOrRealOption, RealOptions, OptionConverters, OptionsUtil, IOptions} from '../options';

export interface IParserOptions extends IOptions {
  relaxedLookup: IncomingOrRealOption<Booleanish, boolean>;
  relaxedPlaceholders: IncomingOrRealOption<Booleanish, boolean>;
  autoTypeHints: IncomingOrRealOption<Booleanish, boolean>;
}

export const DEFAULT_PARSER_OPTIONS: RealOptions<IParserOptions> = {
  // TODO: This should be 'false', but we keep it as this for the sake of easy testing.
  relaxedLookup: true,
  relaxedPlaceholders: true,
  autoTypeHints: true,
}

export const PARSER_OPTIONS_CONVERTERS: OptionConverters<IParserOptions> = {
  autoTypeHints: OptionsUtil.toBoolean,
  relaxedLookup: OptionsUtil.toBoolean,
  relaxedPlaceholders: OptionsUtil.toBoolean,
}