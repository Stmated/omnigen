import {IOmniModel} from '../parse';
import {RealOptions} from '../options';
import {ITargetOptions} from '../interpret';

export interface IOmniModelTransformer<TOpt extends ITargetOptions> {
  transformModel(model: IOmniModel, options: RealOptions<TOpt>): void;
}
