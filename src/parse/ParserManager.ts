import {GenericModel} from '@parse';
import {Parser} from '@parse/Parser';
import {PathLike} from 'fs';
import {SchemaFile} from '@parse/SchemaFile';

export type ParseManagerInput = string | PathLike;

export interface ParseInputOptions {
  input: ParseManagerInput;
  fileName?: string;
}

export interface IParseManager {
  parse(options: ParseInputOptions): Promise<GenericModel>;
}

export class ParserManager implements IParseManager {

  private readonly _parsers: Parser[] = [];

  public register(parser: Parser): void {
    this._parsers.push(parser);
  }

  public unregister(parser: Parser): boolean {
    const index = this._parsers.indexOf(parser);
    if (index == -1) {
      return false;
    }

    this._parsers.splice(index, 1);
    return true;
  }

  async parse(options: ParseInputOptions): Promise<GenericModel> {

    const schemaFile = new SchemaFile(options.input, options.fileName);

    for (const parser of this._parsers) {
      if (await parser.canHandle(schemaFile)) {
        return parser.parse(schemaFile);
      }
    }

    return Promise.reject(new Error("There was no parser registered that could handle the given input"));
  }
}
