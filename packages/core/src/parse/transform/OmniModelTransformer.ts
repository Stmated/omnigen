import {OmniModelTransformerArgs} from './OmniModelTransformerArgs.js';
import {TargetOptions} from '../../interpret';
import {ParserOptions} from '../ParserOptions';
import {OmniModelTransformer2ndPassArgs} from './OmniModelTransformer2ndPassArgs';

export interface OmniModelTransformer<TParserOpt extends ParserOptions> {
  transformModel(args: OmniModelTransformerArgs<TParserOpt>): void;
}

export interface OmniModel2ndPassTransformer<TParserOpt extends ParserOptions, TTargetOpt extends TargetOptions> {
  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<TParserOpt, TTargetOpt>): void;
}
