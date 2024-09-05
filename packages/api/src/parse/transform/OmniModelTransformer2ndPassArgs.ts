import {ParserOptions} from '../ParserOptions';
import {TargetFeatures, TargetOptions} from '../../interpret';
import {ModelTransformOptions} from '../ModelTransformOptions';
import {OmniModelTransformerArgs} from './OmniModelTransformerArgs';

export interface OmniModelTransformer2ndPassArgs<TOpt extends ParserOptions & TargetOptions = ParserOptions & TargetOptions> extends OmniModelTransformerArgs<TOpt> {

  options: TOpt & ModelTransformOptions;
  features: TargetFeatures;
}
