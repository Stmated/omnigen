import {Options, RealOptions} from '../options';
import {OmniModel} from './OmniModel.js';

export interface OmniModelParserResult<TOpt extends Options> {
  model: OmniModel;
  options: RealOptions<TOpt>;
}
