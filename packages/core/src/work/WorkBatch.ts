import {Interpreter, TargetOptions} from '../interpret';
import {OmniModelTransformer, Parser, ParserOptions} from '../parse';
import {AstTransformer} from '../transform';
import {AstNode} from '../ast';
import {Renderer} from '../render';
import {Writer} from '../write';

export interface WorkBatch<
  TParserOpt extends ParserOptions,
  TTargetOpt extends TargetOptions
> {
  parser: Parser<TParserOpt>;
  parserTransformers: OmniModelTransformer<TParserOpt>[];
  interpreter: Interpreter<TTargetOpt>;
  astTransformers: AstTransformer<AstNode, TTargetOpt>;
  renderers: Renderer[];
  writers: Writer[];
}
