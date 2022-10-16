import {OmniModelParserResult, ParserOptions, SchemaFile} from '../parse';
import {OptionsSource, RealOptions} from '../options';

export interface ParserBootstrapFactory<TOpt extends ParserOptions> {
  createParserBootstrap(schemaFile: SchemaFile): Promise<ParserBootstrap<TOpt>>;
}

export interface ParserBootstrap<TOpt extends ParserOptions> extends OptionsSource<TOpt>{
  createParser(options: RealOptions<TOpt>): Parser<TOpt>;
}

export interface Parser<TOpt extends ParserOptions> {
  parse(): OmniModelParserResult<TOpt>;
}
