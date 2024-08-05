import {OmniModelTransformerArgs} from './OmniModelTransformerArgs.js';
import {TargetOptions} from '../../interpret';
import {ParserOptions} from '../ParserOptions';
import {OmniModelTransformer2ndPassArgs} from './OmniModelTransformer2ndPassArgs';

export interface OmniModelTransformer<TParserOpt extends ParserOptions = ParserOptions> {
  transformModel(args: OmniModelTransformerArgs<TParserOpt>): void;
}

export interface OmniModel2ndPassTransformer<TOpt extends ParserOptions & TargetOptions = ParserOptions & TargetOptions> {
  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<TOpt>): void;
}
