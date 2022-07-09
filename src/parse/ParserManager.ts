import {OmniModel} from '@parse';
import {Parser} from '@parse/Parser';
import {PathLike} from 'fs';
import {SchemaFile} from '@parse/SchemaFile';
import {OmniModelTransformer} from '@parse/OmniModelTransformer';
import {IOptions} from '@options';

export type ParseManagerInput = string | PathLike;

export interface ParseInputOptions {
  input: ParseManagerInput;
  fileName?: string;

  // TODO: This is ugly and shows a reverse in responsibilities.
  //        Should be able to send exactly "JavaOptions" for Java, and only send that to the transformers supporting it.
  languageOptions: IOptions;
}

export interface IParseManager {
  parse(options: ParseInputOptions): Promise<OmniModel>;
}

export class ParserManager implements IParseManager {

  private readonly _parsers: Parser[] = [];
  private readonly _modelTransformers: OmniModelTransformer<IOptions>[] = [];

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

  public registerTransformer(transformer: OmniModelTransformer<IOptions>): void {
    this._modelTransformers.push(transformer);
  }

  async parse(options: ParseInputOptions): Promise<OmniModel> {

    const schemaFile = new SchemaFile(options.input, options.fileName);

    for (const parser of this._parsers) {
      if (await parser.canHandle(schemaFile)) {
        return parser.parse(schemaFile)
          .then(model => {
            for (const transformer of this._modelTransformers) {
              transformer.transform(model, options.languageOptions);
            }

            return model;
          });
      }
    }

    return Promise.reject(new Error("There was no parser registered that could handle the given input"));
  }
}
