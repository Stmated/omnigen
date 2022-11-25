import {StandardOptionResolvers} from '../options/StandardOptionResolvers.js';
import {
  Booleanish,
  Option,
  OptionResolvers,
  Options,
} from '../options/index.js';

export interface ParserOptions extends Options {
  relaxedLookup: Option<Booleanish, boolean>;
  relaxedPlaceholders: Option<Booleanish, boolean>;
  autoTypeHints: Option<Booleanish, boolean>;
  relaxedUnknownTypes: Option<Booleanish, boolean>;
  trustedClients: Option<Booleanish, boolean>;
  preferredWrapMode: Option<Booleanish, boolean>;
}

export const DEFAULT_PARSER_OPTIONS: ParserOptions = {
  relaxedLookup: true,
  relaxedPlaceholders: true,
  autoTypeHints: true,
  relaxedUnknownTypes: false,
  trustedClients: false,
  preferredWrapMode: false,
};

export const PARSER_OPTIONS_RESOLVERS: OptionResolvers<ParserOptions> = {
  autoTypeHints: StandardOptionResolvers.toBoolean,
  relaxedLookup: StandardOptionResolvers.toBoolean,
  relaxedPlaceholders: StandardOptionResolvers.toBoolean,
  relaxedUnknownTypes: StandardOptionResolvers.toBoolean,
  trustedClients: StandardOptionResolvers.toBoolean,
  preferredWrapMode: StandardOptionResolvers.toBoolean,
};
