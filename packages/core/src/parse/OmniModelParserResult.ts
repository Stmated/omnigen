import {Options} from '../options/index.ts';
import {OmniModel} from './OmniModel';

export interface OmniModelParserResult<TOpt extends Options> {
  model: OmniModel;
  options: TOpt;
}
