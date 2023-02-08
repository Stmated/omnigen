import {ParserOptions} from '../ParserOptions';
import {TargetFeatures, TargetOptions} from '../../interpret';
import {RealOptions} from '../../options';
import {ModelTransformOptions} from '../ModelTransformOptions';
import {OmniModelTransformerArgs} from './OmniModelTransformerArgs';

export interface OmniModelTransformer2ndPassArgs<
  TParserOpt extends ParserOptions,
  TTargetOpt extends TargetOptions
> extends OmniModelTransformerArgs<TParserOpt> {

  options: RealOptions<TParserOpt>
    & RealOptions<ModelTransformOptions>
    & RealOptions<TTargetOpt>;
  targetFeatures: TargetFeatures;
}
