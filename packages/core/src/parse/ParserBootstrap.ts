import {ParserOptions} from './ParserOptions';
import {OptionsSource, RealOptions} from '../options';
import {Parser} from './Parser';

export interface ParserBootstrap<TOpt extends ParserOptions> extends OptionsSource<TOpt> {
  createParser(options: RealOptions<TOpt>): Parser<TOpt>;
}
