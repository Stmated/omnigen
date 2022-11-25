import {JavaOptions} from '@omnigen/target-java';
import {JsonRpcParserOptions} from '@omnigen/parser-openrpc';
import {Option, Options} from '@omnigen/core';
import {PathLike} from 'fs';

export interface RunOptions extends Options {
  schemaDirBase: Option<string | undefined, PathLike>;
  schemaDirRecursive: Option<boolean | undefined, boolean>;
  schemaPatternInclude: Option<string | undefined, RegExp | undefined>;
  schemaPatternExclude: Option<string | undefined, RegExp | undefined>;
  failSilently: boolean;
}
export interface FileWriteOptions extends Options {
  outputDirBase: Option<string | undefined, PathLike>;
}

export const DEFAULT_RUN_OPTIONS: RunOptions = {
  schemaDirBase: undefined,
  schemaPatternInclude: /^.*\.(?:json|ya?ml)$/,
  schemaPatternExclude: undefined,
  schemaDirRecursive: true,
  failSilently: false,
};

export const DEFAULT_FILE_WRITE_OPTIONS: FileWriteOptions = {
  outputDirBase: undefined,
};

export type OmnigenOptions = RunOptions & JavaOptions & JsonRpcParserOptions & Partial<FileWriteOptions>;
