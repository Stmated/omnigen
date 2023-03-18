import {
  AstNode,
  Interpreter,
  OmniModel,
  OptionsParser,
  ParserOptions,
  SerializedInput, SerializedInputDeserializer,
  SerializedInputSource,
  TargetOptions,
} from '@omnigen/core';
import {RendererCreator} from './RendererCreator';
import {ModelTransformer2Creator, ModelTransformerCreator} from './ModelTransformerCreator';
import {InterpreterCreator} from './InterpreterCreator';
import {WriterCreator} from './WriterCreator';
import {ParserCreator} from './ParserCreator';
import {OptionsParserCreator} from './OptionsParserCreator';
import {AstTransformerCreator} from './AstTransformerCreator';
import {RunOptions} from './RunOptions';

export type PipelineBuilder =
  PipelineBuilderEntrypoint
  & PipelineBuilderWithInput
  & PipelineBuilderWithDeserializer
  & PipelineBuilderWithParserOptions
  & PipelineBuilderWithParser
  & PipelineBuilderWithInterpreter
  & PipelineBuilderWithRenderer;

// TODO: Create a base args where each thing is NEVER
//        Then make it the base type after each step is known to have been ran
//        Then for each step do a "& type" override for the properties for each config call, to specify type!
//          This way we can create pipelines with exact types if they are chained for multiple steps!
//      Because we really need to make it work with the creators actually following a known pattern!
//      It becomes too difficult to keep track of stuff if there is no rigid system behind it all :(

export interface PipelineStepArgs<
  I extends SerializedInput | never = never,
  T = any | never,
  PO extends ParserOptions | never = never,
  M extends OmniModel | never = never,
  TO extends TargetOptions | never = never,
  N extends AstNode | never = never
> {
  run: RunOptions;
  input: I;
  deserialized: T;
  parse: PO;
  model: M;
  target: TO;
  node: N;
}

export type PipelineStep<A, R, Next> = (creator: { (args: A): R }) => Next;

export interface PipelineBuilderEntrypoint<A extends PipelineStepArgs = PipelineStepArgs> {

  from: PipelineStep<
    A,
    SerializedInputSource,
    PipelineBuilderWithInput<A & Pick<PipelineStepArgs, 'input'>>
  >;
  // from(sourceCreator: SerializedInputSourceCreator): PipelineBuilderWithInput;
}

export interface PipelineBuilderWithInput<A extends PipelineStepArgs> {

  thenDeserialize: PipelineStep<
    A,
    SerializedInputDeserializer<any>,
    PipelineBuilderWithDeserializer<A & Pick<PipelineStepArgs, 'deserialized'>>
  >;

  // thenDeserialize<T>(creator: SerializedInputDeserializerCreator<T>)
  //   : PipelineBuilderWithDeserializer<T>;
}

export interface PipelineBuilderWithDeserializer<A> { //} T = any> {

  thenParseOptions: PipelineStep<
    A,
    SerializedInputSource,
    PipelineBuilderWithDeserializer
  >;

  // thenParseOptions<TCreator extends OptionsParserCreator<T>>(creator: TCreator)
  //   : SmartPipelineBuilderWithParserOptions<T, TCreator>;
}

export type SmartPipelineBuilderWithParserOptions<T, TCreator extends OptionsParserCreator<T>> =
  ReturnType<TCreator> extends OptionsParser<infer TRealOpt>
    ? TRealOpt extends ParserOptions
      ? PipelineBuilderWithParserOptions<T, TRealOpt>
      : never
    : never;

export interface PipelineBuilderWithParserOptions<T = any, TParserOpt extends ParserOptions = ParserOptions> {

  thenParse(creator: ParserCreator<T, TParserOpt>)
    : PipelineBuilderWithParser<TParserOpt>;
}

export interface PipelineBuilderWithParser<TParserOpt extends ParserOptions = ParserOptions> extends PipelineBuilderFork {

  withModelTransformer(creator: ModelTransformerCreator<TParserOpt>): this;

  thenInterpret<TCreator extends InterpreterCreator>(creator: TCreator)
    : SmartPipelineBuilderWithInterpreter<TParserOpt, TCreator>;
}

export type SmartPipelineBuilderWithInterpreter<TParserOpt extends ParserOptions, TCreator extends InterpreterCreator> =
  ReturnType<TCreator> extends Interpreter<infer TRealTargetOpt>
    ? PipelineBuilderWithInterpreter<TParserOpt, TRealTargetOpt>
    : never;

export interface PipelineBuilderWithInterpreter<
  TParserOpt extends ParserOptions = ParserOptions,
  TTargetOpt extends TargetOptions = TargetOptions
> {

  withModelTransformer2(creator: ModelTransformer2Creator<TParserOpt, TTargetOpt>): this;

  withAstTransformer(creator: AstTransformerCreator<AstNode, TTargetOpt>): this;

  thenRender(creator: RendererCreator<TTargetOpt>)
    : PipelineBuilderWithRenderer<TTargetOpt>;
}

export interface PipelineBuilderWithRenderer<TTargetOpt extends TargetOptions = TargetOptions> {

  thenWrite(creator: WriterCreator<TTargetOpt>[]): void;
}
