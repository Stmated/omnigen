import {OmniModel} from '@parse/OmniModel';
import {IOptions} from '@options';

export interface OmniModelTransformer<O extends IOptions> {
  transform(model: OmniModel, options: O): void;
}
