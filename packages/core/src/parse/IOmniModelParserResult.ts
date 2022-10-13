import {IOptions, RealOptions} from '../options';
import {IOmniModel} from './OmniModel';

export interface IOmniModelParserResult<TOpt extends IOptions> {
  model: IOmniModel;
  options: RealOptions<TOpt>;
}
