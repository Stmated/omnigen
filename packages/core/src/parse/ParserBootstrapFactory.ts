import {ParserOptions} from './ParserOptions';
import {SchemaFile} from './SchemaFile';
import {ParserBootstrap} from './ParserBootstrap';

export interface ParserBootstrapFactory<TOpt extends ParserOptions> {
  createParserBootstrap(schemaFile: SchemaFile): Promise<ParserBootstrap<TOpt>>;
}
