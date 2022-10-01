import {OmniModelParserResult, SchemaFile} from '@parse';
import {IParserOptions} from '@parse/IParserOptions';
import {IOptionsSource, RealOptions} from '@options';

export interface ParserBootstrapFactory<TOpt extends IParserOptions> {
  createParserBootstrap(schemaFile: SchemaFile): Promise<ParserBootstrap<TOpt>>;
}

export interface ParserBootstrap<TOpt extends IParserOptions> extends IOptionsSource<TOpt>{
  createParser(options: RealOptions<TOpt>): Parser<TOpt>;
}

export interface Parser<TOpt extends IParserOptions> {
  parse(): OmniModelParserResult<TOpt>;
}
