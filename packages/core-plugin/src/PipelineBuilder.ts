import {
  AstNode,
  IncomingOptions,
  OmniModel,
  Options,
  ParserOptions,
  RealOptions,
  RenderResult,
  RunOptions,
  SerializedInput,
  TargetOptions,
} from '@omnigen/core';


/**
 * Mutable Generic State args for the pipeline building
 */
export interface PipelineArgs {
  run: RunOptions;
  input: SerializedInput;
  deserialized: any;
  options: Options;
  model: OmniModel;
  node: AstNode;
  rendered: RenderResult;
}

/**
 * Used to simplify the type's representation in most IDE:s
 */
type Args<T> = { [KeyType in keyof T]: T[KeyType] } & {};

export type PipeStep<A, V> = { (args: Args<A>): V };

export type PipeNext<
  P extends Partial<PipelineArgs>,
  K extends keyof PipelineArgs,
  N extends keyof PipelineBuilder<P>,
  V extends PipelineArgs[K] | void = PipelineArgs[K]
> = Pick<PipelineBuilder<P & Record<K, V>>, N | 'build'>

// TODO: Figure out a way to hide the "build" function, unless we are in test cases or whatever
//          so it follows along if created it as a test pipeline builder
export type PipeFunc<
  P extends Partial<PipelineArgs>,
  K extends keyof PipelineArgs,
  N extends keyof PipelineBuilder<P>,
  PV extends PipelineArgs[K] | void = PipelineArgs[K],
  SA extends P | void = P
> =
  SA extends P
  ? { <V extends PV>(step: PipeStep<SA, V>): PipeNext<P, K, N, V> }
  : { (): PipeNext<P, K, N, PV> }

// TODO: Check if instead of strings we can refer to the other Func types as filters for what to see on the next step
//        Less code, and maybe easier to understand what goes to what in what order

export type FromPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'input', 'thenDeserialize'>;
export type DeserializePipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'deserialized', 'thenParseOptions'>;
export type ParseOptionsPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'options', 'thenParseOptionsResolver' | 'thenParseOptionsDefaultResolver' | 'thenParse', IncomingOptions<ParserOptions>>;
export type ParseOptionsResolverPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'options', 'thenParse', RealOptions<ParserOptions>>;
export type ParseOptionsDefaultResolverPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'options', 'thenParse', RealOptions<ParserOptions>, void>;
export type ParsePipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'model', 'withModelTransformer' | 'thenParseTargetOptions'>;
export type ModelTransformerPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'model', 'withModelTransformer' | 'thenParseTargetOptions', void>;
export type ParseTargetOptionsPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'options', 'resolveTargetOptions' | 'resolveTargetOptionsDefault', RealOptions<ParserOptions> & IncomingOptions<TargetOptions>>;
export type ParseTargetOptionsResolverPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'options', 'thenInterpret', RealOptions<ParserOptions & TargetOptions>>;
export type ParseTargetOptionsDefaultResolverPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'options', 'thenInterpret', RealOptions<ParserOptions & TargetOptions>, void>;
export type InterpretPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'node', 'withModelTransformer2' | 'withAstTransformer' | 'thenRender'>;
export type ModelTransformer2PipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'model', 'withModelTransformer2' | 'withAstTransformer' | 'thenRender', void>;
export type AstTransformerPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'node', 'withModelTransformer2' | 'withAstTransformer' | 'thenRender', void>;
export type RenderPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'rendered', 'thenWrite'>;
export type WritePipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'rendered', keyof {}, void>;

export interface PipelineBuilder<P extends Partial<PipelineArgs>> {
  from: FromPipeFunc<P>;
  thenDeserialize: DeserializePipeFunc<P>;
  thenParseOptions: ParseOptionsPipeFunc<P>;
  thenParseOptionsResolver: ParseOptionsResolverPipeFunc<P>;
  thenParseOptionsDefaultResolver: ParseOptionsDefaultResolverPipeFunc<P>;
  thenParse: ParsePipeFunc<P>;
  withModelTransformer: ModelTransformerPipeFunc<P>;
  thenParseTargetOptions: ParseTargetOptionsPipeFunc<P>;
  resolveTargetOptions: ParseTargetOptionsResolverPipeFunc<P>;
  resolveTargetOptionsDefault: ParseTargetOptionsDefaultResolverPipeFunc<P>;
  thenInterpret: InterpretPipeFunc<P>;
  withModelTransformer2: ModelTransformer2PipeFunc<P>;
  withAstTransformer: AstTransformerPipeFunc<P>;
  thenRender: RenderPipeFunc<P>;
  thenWrite: WritePipeFunc<P>;

  /**
   * Do not call this method yourself, it is called by the creating pipeline manager.
   */
  build(): Args<P>;
}


// export type PipelineFunc<I, P extends Partial<PipelineArgs>> = { (args: P): I };
//
// export interface PipelineBuilderWithInput<A extends PipelineArgs, P extends Partial<A>> {
//   thenDeserialize<T>(creator: PipelineFunc<T, A>)
//     : PipelineBuilderWithDeserializer<With<A, 'deserialized', T>>;
// }
//
// export interface PipelineBuilderWithDeserializer<A extends Partial<PipelineArgs>> {
//   thenParseOptions<O extends ParserOptions>(creator: PipelineFunc<O, A>)
//     : PipelineBuilderWithParserOptions<With<A, 'options', O>>;
// }
//
// export interface PipelineBuilderWithParserOptions<A extends Partial<PipelineArgs>> {
//   thenParse<M extends OmniModel>(creator: PipelineFunc<M, A>)
//     : PipelineBuilderWithParser<With<A, 'model', M>>;
// }
//
// export interface PipelineBuilderWithParser<A extends Partial<PipelineArgs>> {
//   withModelTransformer(creator: PipelineFunc<A['model'], A>)
//     : this;
//
//   thenParseTargetOptions<O extends TargetOptions>(creator: PipelineFunc<O, A>)
//     : PipelineBuilderWithTargetOptions<With<A, 'options', A['options'] & O>>;
// }
//
// export interface PipelineBuilderWithTargetOptions<A extends Partial<PipelineArgs>> {
//   thenInterpret<N extends AstNode>(creator: PipelineFunc<N, A>)
//     : PipelineBuilderWithInterpreter<With<A, 'node', N>>;
// }
//
// export interface PipelineBuilderWithInterpreter<A extends Partial<PipelineArgs>> {
//   withModelTransformer2(creator: PipelineFunc<A['model'], A>)
//     : this;
//
//   withAstTransformer(creator: PipelineFunc<A['node'], A>)
//     : this;
//
//   thenRender<R extends RenderResult>(creator: PipelineFunc<R, A>)
//     : PipelineBuilderWithRenderer<With<A, 'rendered', R>>;
// }
//
// export interface PipelineBuilderWithRenderer<A extends Partial<PipelineArgs>> {
//   thenWrite(creator: { (args: A): void })
//     : void;
// }
