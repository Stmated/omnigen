import {JavaOptions} from '@omnigen/target-java';
import {JsonRpcParserOptions} from '@omnigen/parser-openrpc';
import {Option, Options} from '@omnigen/core';

export interface RunOptions extends Options {
  schemaDirBase: Option<string | undefined, string>;
  schemaDirRecursive: Option<boolean | undefined, boolean>;
  schemaPatternInclude: Option<string | undefined, RegExp | undefined>;
  schemaPatternExclude: Option<string | undefined, RegExp | undefined>;
  failSilently: boolean;
}

export const DEFAULT_RUN_OPTIONS: RunOptions = {
  schemaDirBase: undefined,
  schemaPatternInclude: /^.*\.(?:json|ya?ml)$/,
  schemaPatternExclude: undefined,
  schemaDirRecursive: true,
  failSilently: false,
};

export type OmnigenOptions = RunOptions & JavaOptions & JsonRpcParserOptions;
