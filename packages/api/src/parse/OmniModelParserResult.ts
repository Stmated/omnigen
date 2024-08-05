import {Options} from '../options';
import {OmniModel} from './OmniModel';

export interface OmniModelParserResult<TOpt extends Options> {
  model: OmniModel;
  options: TOpt;
}
