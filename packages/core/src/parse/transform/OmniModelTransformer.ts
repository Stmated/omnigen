import {OmniModelTransformerArgs} from './OmniModelTransformerArgs.js';
import {TargetOptions} from '../../interpret/index.ts';
import {ParserOptions} from '../ParserOptions';
import {OmniModelTransformer2ndPassArgs} from './OmniModelTransformer2ndPassArgs';

export interface OmniModelTransformer<TParserOpt extends ParserOptions = ParserOptions> {
  transformModel(args: OmniModelTransformerArgs<TParserOpt>): void;
}

export interface OmniModel2ndPassTransformer<
  TParserOpt extends ParserOptions = ParserOptions,
  TTargetOpt extends TargetOptions = TargetOptions
> {
  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<TParserOpt, TTargetOpt>): void;
}
