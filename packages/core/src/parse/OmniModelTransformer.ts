import {OmniModel} from '../parse/index.js';
import {RealOptions} from '../options/index.js';
import {TargetOptions} from '../interpret/index.js';

export interface OmniModelTransformer<TOpt extends TargetOptions> {
  transformModel(model: OmniModel, options: RealOptions<TOpt>): void;
}
