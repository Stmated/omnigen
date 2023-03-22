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

export type StepSupplier<A, V> = { (args: Args<A>): V };

type Prop<
  A,
  RK extends string,
  RT
> = {
  [K in Exclude<keyof A, RK>]: A[K]
} & Record<RK, RT>

export type BuilderMethods = keyof PipelineBuilder<any, any>;
/**
 * @param A - Current known built arguments
 * @param M - Exposed extra methods of the builder
 * @param K - The argument this step will update
 * @param N - The exposed builder methods for next step
 * @param V - The value given to property {@link K} of arguments.
 */
export type PipeNext<
  A,
  M extends BuilderMethods,
  K extends keyof PipelineArgs,
  N extends BuilderMethods,
  V
> = V extends void
    ? Pick<PipelineBuilder<A, M>, N | M>
    : Pick<PipelineBuilder<Simplify<Prop<A, K, V>>, M>, N | M>

/**
 * @param PV - The value type required to be returned by the {@link StepSupplier}, same as args if not specified.
 * @param SA - The arguments given to the {@link StepSupplier} or no-args supplier if `void`.
 */
export type S<
  A,
  M extends BuilderMethods,
  K extends keyof PipelineArgs,
  N extends BuilderMethods,
  PV extends PipelineArgs[K] | void = PipelineArgs[K],
  SA extends A | void = A
> =
  SA extends void
    ? { (): PipeNext<A, M, K, N, PV> }
    : { <V extends PV>(supplier: StepSupplier<SA, V>): PipeNext<A, M, K, N, V> }

export type PipeInitialOptions = IncomingOptions<ParserOptions & Partial<IncomingOptions<TargetOptions>>>;
export type PipeLateOptions = RealOptions<ParserOptions> & IncomingOptions<TargetOptions>;

export type InputStep<A, M extends BuilderMethods>
  = S<A, M, 'input', 'deserialize'>;
export type DeserializeStep<A, M extends BuilderMethods>
  = S<A, M, 'deserialized', 'withOptions'>;
export type ParseOptionsStep<A, M extends BuilderMethods>
  = S<A, M, 'options', 'withOptions' | 'resolveOptions' | 'resolveParserOptionsDefault' | 'parse', PipeInitialOptions>;
export type ResolveOptionsStep<A, M extends BuilderMethods>
  = S<A, M, 'options', 'parse', RealOptions<ParserOptions>>;
export type ResolveOptionsDefaultStep<A, M extends BuilderMethods>
  = S<A, M, 'options', 'parse', RealOptions<ParserOptions>, void>;
export type ParseStep<A, M extends BuilderMethods>
  = S<A, M, 'model', 'withModelTransformer' | 'withTargetOptions'>;
export type ModelTransformerStep<A, M extends BuilderMethods>
  = S<A, M, 'model', 'withModelTransformer' | 'withTargetOptions', void>;
export type TargetOptionsStep<A, M extends BuilderMethods>
  = S<A, M, 'options', 'withTargetOptions' | 'resolveTargetOptions' | 'resolveTargetOptionsDefault', PipeLateOptions>;
export type ResolveTargetOptionsStep<A, M extends BuilderMethods>
  = S<A, M, 'options', 'interpret', RealOptions<ParserOptions & TargetOptions>>;
export type ResolveTargetOptionsDefaultStep<A, M extends BuilderMethods>
  = S<A, M, 'options', 'interpret', RealOptions<ParserOptions & TargetOptions>, void>;
export type InterpretStep<A, M extends BuilderMethods>
  = S<A, M, 'node', 'withLateModelTransformer' | 'withAstTransformer' | 'render'>;
export type LateModelTransformerStep<A, M extends BuilderMethods>
  = S<A, M, 'model', 'withLateModelTransformer' | 'withAstTransformer' | 'render', void>;
export type AstTransformerStep<A, M extends BuilderMethods>
  = S<A, M, 'node', 'withLateModelTransformer' | 'withAstTransformer' | 'render', void>;
export type RenderStep<A, M extends BuilderMethods>
  = S<A, M, 'rendered', 'write'>;
export type WriteStep<A, M extends BuilderMethods>
  = S<A, M, 'rendered', keyof {}, void>;

/**
 * Separated so we get better IDE auto-complete when starting the pipeline.
 * <p />
 * Pick&lt;,&gt; can create confusion about what is a property or method, and we get some help remedying it this way.
 */
export interface PipeStart<A, M extends BuilderMethods> {
  from: InputStep<A, M>;
}

export interface PipelineBuilder<A, M extends BuilderMethods> extends PipeStart<A, M> {
  deserialize: DeserializeStep<A, M>;
  withOptions: ParseOptionsStep<A, M>;
  resolveOptions: ResolveOptionsStep<A, M>;
  resolveParserOptionsDefault: ResolveOptionsDefaultStep<A, M>;
  parse: ParseStep<A, M>;
  withModelTransformer: ModelTransformerStep<A, M>;
  withTargetOptions: TargetOptionsStep<A, M>;
  resolveTargetOptions: ResolveTargetOptionsStep<A, M>;
  resolveTargetOptionsDefault: ResolveTargetOptionsDefaultStep<A, M>;
  interpret: InterpretStep<A, M>;
  withLateModelTransformer: LateModelTransformerStep<A, M>;
  withAstTransformer: AstTransformerStep<A, M>;
  render: RenderStep<A, M>;
  write: WriteStep<A, M>;

  /**
   * Do not call this method yourself, it is called by the creating pipeline manager.
   */
  build(): Args<A>;
}
