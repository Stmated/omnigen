import {OmniModel} from '../parse';
import {RealOptions} from '../options';
import {TargetOptions} from '../interpret';

export interface OmniModelTransformer<TOpt extends TargetOptions> {
  transformModel(model: OmniModel, options: RealOptions<TOpt>): void;
}
