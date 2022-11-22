import {ParserOptions} from '../parse/index.js';
import {TargetOptions} from '../interpret/index.js';
import {IncomingOptions} from './IncomingOptions.js';

export interface OptionsSource<TOpt extends ParserOptions> {
  getIncomingOptions<TTargetOptions extends TargetOptions>(): IncomingOptions<TOpt & TTargetOptions> | undefined;
}
