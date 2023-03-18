import {OmniModel2ndPassTransformer, OmniModelTransformer, ParserOptions, TargetOptions} from '@omnigen/core';

export type ModelTransformerCreator<TParserOpt extends ParserOptions = ParserOptions>
  = { (options: TParserOpt): OmniModelTransformer<TParserOpt> };

export type ModelTransformer2Creator<TParserOpt extends ParserOptions = ParserOptions, TTargetOpt extends TargetOptions = TargetOptions>
  = { (options: TParserOpt): OmniModel2ndPassTransformer<TParserOpt, TTargetOpt> };
