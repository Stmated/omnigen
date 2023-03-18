import {
  Booleanish,
  Option,
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
