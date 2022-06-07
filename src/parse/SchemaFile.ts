import {ParseManagerInput} from '@parse/ParserManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import pino from 'pino';

export const logger = pino({
  name: 'app-name',
  level: 'debug',
});

/**
 * Used for caching and converting a target file or string into a structure object.
 * Used so that each parser can attempt to read the file, without needing to redo the reading over and over.
 */
export class SchemaFile {
  private readonly _input: ParseManagerInput;
  private readonly _fileName?: string;
  private _parsedObject?: unknown;
  private _readContent?: string;

  constructor(input: ParseManagerInput, fileName?: string) {
    this._input = input;
    this._fileName = fileName;
  }

  public async asObject(): Promise<unknown> {
    if (this._parsedObject !== undefined) {
      return Promise.resolve(this._parsedObject);
    }

    const str = await this.asString();
    return this._parsedObject = JSON.parse(str) as unknown;
  }

  public async asString(): Promise<string> {
    if (this._readContent !== undefined) {
      return this._readContent;
    }

    if (typeof this._input === 'string') {
      if (this._input.split('\n').length > 1) {
        // If the input is multiline, then we assume it is the raw content.
        return Promise.resolve(this._input);
      } else {
        const absolutePath = path.resolve(this._input);
        logger.info(`Absolute path is ${absolutePath}`);
      }
    }

    const buffer = await fs.readFile(this._input, {});
    return this._readContent = buffer.toString();

    // const handle = await fs.open(this._input);
    // try {
    //   const result = await handle.read();
    //
    //   return this._readContent = result.buffer.toString();
    // } finally {
    //   await handle.close();
    // }
  }
}
