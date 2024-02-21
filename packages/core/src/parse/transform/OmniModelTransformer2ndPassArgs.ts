import {ParserOptions} from '../ParserOptions';
import {TargetFeatures, TargetOptions} from '../../interpret';
import {ModelTransformOptions} from '../ModelTransformOptions';
import {OmniModelTransformerArgs} from './OmniModelTransformerArgs';

export interface OmniModelTransformer2ndPassArgs<
  TParserOpt extends ParserOptions,
  TTargetOpt extends TargetOptions
> extends OmniModelTransformerArgs<TParserOpt> {

  options: TParserOpt & ModelTransformOptions & TTargetOpt;
  targetFeatures: TargetFeatures;
}
