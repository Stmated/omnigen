import * as fs from 'fs/promises';
import * as path from 'path';
import {LoggerFactory} from '@omnigen/core-log';
import {PathLike} from 'fs';

export const logger = LoggerFactory.create(__filename);

export type SchemaFileInput = string | PathLike;

/**
 * Used for caching and converting a target file or string into a structure object.
 * Used so that each parser can attempt to read the file, without needing to redo the reading over and over.
 */
export class SchemaFile {
  private readonly _input: SchemaFileInput;
  private readonly _fileName?: string;
  private _parsedObject?: unknown;
  private _readContent?: string;

  constructor(input: SchemaFileInput, fileName?: string) {
    this._input = input;
    this._fileName = fileName;
  }

  public getAbsolutePath(): string | undefined {
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

  public async asObject<R>(): Promise<R> {
    if (this._parsedObject !== undefined) {
      return Promise.resolve(this._parsedObject as R);
    }

    const str = await this.asString();
    return this._parsedObject = JSON.parse(str) as R;
  }

  public async asString(): Promise<string> {
    if (this._readContent !== undefined) {
      return this._readContent;
    }

    if (typeof this._input === 'string') {
      if (this._input.indexOf('\n') !== -1) {
        // If the input is multiline, then we assume it is the raw content.
        return Promise.resolve(this._input);
      }
    }

    if (this._input instanceof Buffer) {
      return this._input.toString();
    }

    const path = this.getAbsolutePath() || '';
    logger.info(`Going to read content from ${path}`);
    const buffer = await fs.readFile(path, {});
    return this._readContent = buffer.toString();
  }
}
