import {ParserOptions} from '../parse';
import {TargetOptions} from '../interpret';
import {IncomingOptions} from './IncomingOptions';

export interface OptionsSource<TParserOpt extends ParserOptions> {
  getIncomingOptions<TTargetOpt extends TargetOptions>(): IncomingOptions<TParserOpt & TTargetOpt> | undefined;
}
