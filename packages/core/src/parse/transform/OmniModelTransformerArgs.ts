import {OmniModel} from '../OmniModel.js';
import {RealOptions} from '../../options/index.js';
import {ParserOptions} from '../ParserOptions.js';
import {ModelTransformOptions} from '../ModelTransformOptions.js';
import {TargetFeatures, TargetOptions} from '../../interpret/index.js';

export interface OmniModelTransformerArgs<TParserOpt extends ParserOptions> {

  model: OmniModel;
  options: RealOptions<TParserOpt>
    & RealOptions<ModelTransformOptions>;
}

export interface OmniModelTransformer2ndPassArgs<
  TParserOpt extends ParserOptions,
  TTargetOpt extends TargetOptions
> extends OmniModelTransformerArgs<TParserOpt> {

  options: RealOptions<TParserOpt>
    & RealOptions<ModelTransformOptions>
    & RealOptions<TTargetOpt>;
  targetFeatures: TargetFeatures;
}
