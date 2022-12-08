import {OmniModelTransformer2ndPassArgs, ParserOptions} from '../index.js';
import {OmniModelTransformerArgs} from './OmniModelTransformerArgs.js';
import {TargetOptions} from '../../interpret/index.js';

export interface OmniModelTransformer<TParserOpt extends ParserOptions> {
  transformModel(args: OmniModelTransformerArgs<TParserOpt>): void;
}

export interface OmniModel2ndPassTransformer<TParserOpt extends ParserOptions, TTargetOpt extends TargetOptions> {
  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<TParserOpt, TTargetOpt>): void;
}
