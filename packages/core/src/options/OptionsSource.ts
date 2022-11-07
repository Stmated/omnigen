import {ParserOptions} from '../parse';
import {TargetOptions} from '../interpret';
import {IncomingOptions} from './IncomingOptions';

export interface OptionsSource<TOpt extends ParserOptions> {
  getIncomingOptions<TTargetOptions extends TargetOptions>(): IncomingOptions<TOpt & TTargetOptions> | undefined;
}
