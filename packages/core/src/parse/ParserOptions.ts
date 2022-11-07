import {Booleanish, Option, RealOptions, OptionResolver, Options} from '../options';
import {OptionsResolvers} from '../options/OptionsResolvers';

export interface ParserOptions extends Options {
  relaxedLookup: Option<Booleanish, boolean>;
  relaxedPlaceholders: Option<Booleanish, boolean>;
  autoTypeHints: Option<Booleanish, boolean>;
  relaxedUnknownTypes: Option<Booleanish, boolean>;
}

export const DEFAULT_PARSER_OPTIONS: RealOptions<ParserOptions> = {
  relaxedLookup: true,
  relaxedPlaceholders: true,
  autoTypeHints: true,
  relaxedUnknownTypes: false,
};

export const PARSER_OPTIONS_CONVERTERS: OptionResolver<ParserOptions> = {
  autoTypeHints: OptionsResolvers.toBoolean,
  relaxedLookup: OptionsResolvers.toBoolean,
  relaxedPlaceholders: OptionsResolvers.toBoolean,
  relaxedUnknownTypes: OptionsResolvers.toBoolean,
};
