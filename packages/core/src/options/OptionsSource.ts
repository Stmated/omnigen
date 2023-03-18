import {ParserOptions} from '../parse/index.js';
import {TargetOptions} from '../interpret';
import {IncomingOptions} from './IncomingOptions.js';

export interface OptionsSource<TParserOpt extends ParserOptions> {
  getIncomingOptions<TTargetOpt extends TargetOptions>(): IncomingOptions<TParserOpt & TTargetOpt> | undefined;
}
