import {ParserOptions} from './ParserOptions';
import {ParserBootstrap} from './ParserBootstrap';
import {SchemaSource} from './SchemaSource';

export interface ParserBootstrapFactory<TOpt extends ParserOptions> {
  createParserBootstrap(schemaSource: SchemaSource): Promise<ParserBootstrap<TOpt>>;
}
