import {IOmniModelParserResult, IParserOptions, SchemaFile} from '../parse';
import {IOptionsSource, RealOptions} from '../options';

export interface IParserBootstrapFactory<TOpt extends IParserOptions> {
  createParserBootstrap(schemaFile: SchemaFile): Promise<IParserBootstrap<TOpt>>;
}

export interface IParserBootstrap<TOpt extends IParserOptions> extends IOptionsSource<TOpt>{
  createParser(options: RealOptions<TOpt>): IParser<TOpt>;
}

export interface IParser<TOpt extends IParserOptions> {
  parse(): IOmniModelParserResult<TOpt>;
}
