import {ParserOptions} from './ParserOptions';
import {OptionsSource} from '../options';
import {Parser} from './Parser';

export interface ParserBootstrap<TOpt extends ParserOptions> extends OptionsSource {
  createParser(options: TOpt): Parser<TOpt>;
}
