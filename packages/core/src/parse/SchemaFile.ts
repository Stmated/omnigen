import * as fs from 'fs';
import * as path from 'path';
import {LoggerFactory} from '@omnigen/core-log';
import {PathLike} from 'fs';
import {SchemaSource} from '@omnigen/api';
import * as YAML from 'yaml';

const logger = LoggerFactory.create(import.meta.url);

export type SchemaFileInput = string | PathLike;

/**
 * Used for caching and converting a target file or string into a structure object.
 * Used so that each parser can attempt to read the file, without needing to redo the reading over and over.
 */
export class SchemaFile implements SchemaSource {
  private readonly _input: SchemaFileInput;
  private readonly _fileName?: string | undefined;
  private _parsedObject?: unknown | undefined;
  private _readContent?: string | undefined;

  constructor(input: SchemaFileInput, fileName?: string) {
    this._input = input;
    this._fileName = fileName;
  }

  getAbsolutePath(): string | undefined {
    if (typeof this._input === 'string') {
      if (this._input.indexOf('\n') !== -1) {
        return this._fileName ? path.resolve(this._fileName) : undefined;
      }
    }

    if (typeof this._input == 'string') {
      return path.resolve(this._input);
    }

    if (this._input instanceof URL) {
      return this._input.toString();
    }

    return this._fileName ? path.resolve(this._fileName) : undefined;
  }

  asObject<R>(): R {
    if (this._parsedObject !== undefined) {
      return this._parsedObject as R;
    }

    const str = (this.asString()).trim();
    const name = (this._fileName ?? '').toLowerCase();
    if (name.endsWith('.yml') || name.endsWith('.yaml')) {
      this._parsedObject = YAML.parse(str);
    } else if (name.endsWith('.json')) {
      this._parsedObject = JSON.parse(str);
    } else {
      if (str.startsWith('{') || str.startsWith('[')) {
        this._parsedObject = JSON.parse(str);
      } else {
        this._parsedObject = YAML.parse(str);
      }
    }

    return this._parsedObject as R;
  }

  asString(): string {
    if (this._readContent !== undefined) {
      return this._readContent;
    }

    if (typeof this._input === 'string') {
      if (this._input.indexOf('\n') !== -1) {
        // If the input is multiline, then we assume it is the raw content.
        return this._input;
      }
    }

    if (this._input instanceof Buffer) {
      return this._input.toString();
    }

    const path = this.getAbsolutePath() || '';
    logger.debug(`Reading content from ${path}`);
    const buffer = fs.readFileSync(path, {});
    this._readContent = buffer.toString();
    return this._readContent;
  }
}
