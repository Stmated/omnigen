import {OmniModel} from '@parse/OmniModel';
import {IncomingOptions, RealOptions} from '@options';
import {ITargetOptions} from '@interpret';

export interface OmniModelTransformer<TOpt extends ITargetOptions> {
  transformModel(model: OmniModel, options: RealOptions<TOpt>): void;
}
