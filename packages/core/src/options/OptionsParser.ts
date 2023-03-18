import {Options} from './Options';
import {IncomingOptions} from './IncomingOptions';

/**
 * Takes a set of options and
 */
export interface OptionsParser<TOpt extends Options> {

  parse(options: IncomingOptions<TOpt>): TOpt;
}
