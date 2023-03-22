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
import {Simplify} from 'type-fest';

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

type Prop<O extends Partial<PipelineArgs>, RK extends string, RT> = {
  [K in Exclude<keyof O, RK>]: O[K]
} & Record<RK, RT>

export type PipeNext<
  P extends Partial<PipelineArgs>,
  K extends keyof PipelineArgs,
  N extends keyof PipelineBuilder<P>,
  V extends PipelineArgs[K] | void
> = V extends void
    ? Pick<PipelineBuilder<P>, N | 'build'>
    : Pick<PipelineBuilder<Simplify<Prop<P, K, V>>>, N | 'build'>

// TODO: Figure out a way to hide the "build" function, unless we are in test cases or whatever
//          so it follows along if created it as a test pipeline builder.
//          Send along as a generic to the PipelineBuilder? So we can globally show/hide methods?
export type PipeFunc<
  P extends Partial<PipelineArgs>,
  K extends keyof PipelineArgs,
  N extends keyof PipelineBuilder<P>,
  PV extends PipelineArgs[K] | void = PipelineArgs[K],
  SA extends P | void = P
> =
  SA extends void
    ? { (): PipeNext<P, K, N, PV> }
    : { <V extends PV>(step: PipeStep<SA, V>): PipeNext<P, K, N, V> }

// TODO: Check if instead of strings we can refer to the other Func types as filters for what to see on the next step
//        Less code, and maybe easier to understand what goes to what in what order

export type FromPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'input', 'thenDeserialize'>;
export type DeserializePipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'deserialized', 'withOptions'>;
export type ParseOptionsPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'options', 'withOptions' | 'resolveParserOptions' | 'resolveParserOptionsDefault' | 'thenParse', IncomingOptions<ParserOptions & Partial<IncomingOptions<TargetOptions>>>>;
export type ParseOptionsResolverPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'options', 'thenParse', RealOptions<ParserOptions>>;
export type ParseOptionsDefaultResolverPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'options', 'thenParse', RealOptions<ParserOptions>, void>;
export type ParsePipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'model', 'withModelTransformer' | 'withTargetOptions'>;
export type ModelTransformerPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'model', 'withModelTransformer' | 'withTargetOptions', void>;
export type TargetOptionsPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'options', 'withTargetOptions' | 'resolveTargetOptions' | 'resolveTargetOptionsDefault', RealOptions<ParserOptions> & IncomingOptions<TargetOptions>>;
export type ParseTargetOptionsResolverPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'options', 'thenInterpret', RealOptions<ParserOptions & TargetOptions>>;
export type ParseTargetOptionsDefaultResolverPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'options', 'thenInterpret', RealOptions<ParserOptions & TargetOptions>, void>;
export type InterpretPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'node', 'withLateModelTransformer' | 'withAstTransformer' | 'thenRender'>;
export type LateModelTransformerPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'model', 'withLateModelTransformer' | 'withAstTransformer' | 'thenRender', void>;
export type AstTransformerPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'node', 'withLateModelTransformer' | 'withAstTransformer' | 'thenRender', void>;
export type RenderPipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'rendered', 'thenWrite'>;
export type WritePipeFunc<P extends Partial<PipelineArgs>>
  = PipeFunc<P, 'rendered', keyof {}, void>;

export interface PipelineBuilder<P extends Partial<PipelineArgs>> {
  from: FromPipeFunc<P>;
  thenDeserialize: DeserializePipeFunc<P>;
  withOptions: ParseOptionsPipeFunc<P>;
  resolveParserOptions: ParseOptionsResolverPipeFunc<P>;
  resolveParserOptionsDefault: ParseOptionsDefaultResolverPipeFunc<P>;
  thenParse: ParsePipeFunc<P>;
  withModelTransformer: ModelTransformerPipeFunc<P>;
  withTargetOptions: TargetOptionsPipeFunc<P>;
  resolveTargetOptions: ParseTargetOptionsResolverPipeFunc<P>;
  resolveTargetOptionsDefault: ParseTargetOptionsDefaultResolverPipeFunc<P>;
  thenInterpret: InterpretPipeFunc<P>;
  withLateModelTransformer: LateModelTransformerPipeFunc<P>;
  withAstTransformer: AstTransformerPipeFunc<P>;
  thenRender: RenderPipeFunc<P>;
  thenWrite: WritePipeFunc<P>;

  /**
   * Do not call this method yourself, it is called by the creating pipeline manager.
   */
  build(): Args<P>;
}
