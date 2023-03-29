import {
  AstNode,
  IncomingOptions,
  Interpreter,
  ModelTransformOptions,
  OmniModel,
  OmniModelTransformer,
  Options,
  Parser,
  ParserOptions,
  RealOptions,
  Renderer,
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
  parser: Parser;
  model: OmniModel;
  modelTransformers: OmniModelTransformer[];
  interpreter: Interpreter;
  node: AstNode;
  renderer: Renderer;
  // rendered: RenderResult;
}

/**
 * Used to simplify the type's representation in most IDE:s
 */
type Args<T> = { [KeyType in keyof T]: T[KeyType] } & {};

type IncParse = IncomingOptions<ParserOptions>;
type IncTransform = IncomingOptions<ModelTransformOptions>;
type PreIncTransform = Partial<IncTransform>;
type IncTarget = IncomingOptions<TargetOptions>;
type PreIncTarget = Partial<IncTarget>;

export type PipeInitialOptions = IncParse & PreIncTransform & PreIncTarget;
export type PipeParserOptions = RealOptions<ParserOptions> & PreIncTransform & PreIncTarget;

export type PipeModelTransformOptions = RealOptions<ParserOptions> & IncTransform & PreIncTarget;
export type PipeResolvedModelTransformOptions =
  RealOptions<ParserOptions>
  & RealOptions<ModelTransformOptions>
  & PreIncTarget;

export type PipeTargetOptions = RealOptions<ParserOptions & ModelTransformOptions> & IncTarget;
export type PipeResolvedTargetOptions = RealOptions<ParserOptions & ModelTransformOptions & TargetOptions>;

export type PipelineIn<A, V> = { (args: Args<A>): V };


export type PipelineNext<A, N extends Partial<PipelineArgs>, PK extends keyof Pipeline<A> = keyof {}> = Simplify<Pick<Pipeline<{
  [AK in Exclude<keyof A, keyof N>]: A[AK]
} & N>, PK>>;

export type TypeAfterStart = Pick<PipelineArgs, 'run'>;
export type TypeAfterFrom = TypeAfterStart & Pick<PipelineArgs, 'input'>;
export type TypeAfterDeserialize = TypeAfterStart & Pick<PipelineArgs, 'deserialized'>;

// type Modify<A extends Partial<PipelineArgs>, R extends Partial<PipelineArgs> /*K extends keyof PipelineArgs, V extends PipelineArgs[K]*/>
//   = Omit<A, keyof R> & R;
//
// export type TypeAfterStart = Pick<PipelineArgs, 'run'>;
// export type TypeAfterFrom = TypeAfterStart & Pick<PipelineArgs, 'input'>;
// export type TypeAfterDeserialize<A, V> = Modify<TypeAfterFrom, {deserialized: V}>; //  & Pick<PipelineArgs, 'deserialized'>;
// export type TypeAfterWithOptions<A, V extends PipeInitialOptions> = Modify<TypeAfterDeserialize<A>, {options: V}>;

export interface Pipeline<A> {

  start<V extends RunOptions>(supplier: PipelineIn<A, V>):
    PipelineNext<A, {'run': V}, 'from'>;


  from<V extends SerializedInput>(supplier: PipelineIn<A, V>):
    PipelineNext<A, {'input': V}, 'deserialize'>;


  deserialize<V>(supplier: PipelineIn<A, V>):
    PipelineNext<A, {'deserialized': V}, 'withOptions'>;


  withOptions<V extends PipeInitialOptions>(supplier: PipelineIn<A, V>):
    PipelineNext<A, {'options': V}, 'withOptions' | 'resolveOptions' | 'resolveParserOptionsDefault'>;


  resolveOptions<V extends PipeParserOptions>(supplier: PipelineIn<A, V>):
    PipelineNext<A, {'options': V}, 'resolveOptions' | 'parse'>;

  resolveParserOptionsDefault():
    PipelineNext<A, {'options': PipeParserOptions}, 'parse'>;


  parse<V extends OmniModel>(supplier: PipelineIn<A, V>):
    PipelineNext<A, {'model': V}, 'resolveTransformOptions' | 'resolveTransformOptionsDefault' | 'withTargetOptions'>;


  resolveTransformOptions<V extends PipeResolvedModelTransformOptions>(supplier: PipelineIn<A, V>):
    PipelineNext<A, {'options': V}, 'resolveTransformOptions' | 'resolveTransformOptionsDefault' | 'withModelTransformer' | 'withTargetOptions'>;

  resolveTransformOptionsDefault():
    PipelineNext<A, {'options': PipeResolvedModelTransformOptions}, 'withModelTransformer' | 'withTargetOptions'>;


  withModelTransformer<V extends OmniModelTransformer>(supplier: PipelineIn<A, V>):
    Pick<Pipeline<A>, 'withModelTransformer' | 'withTargetOptions' | 'resolveTargetOptions'>;


  withTargetOptions<V extends PipeTargetOptions>(supplier: PipelineIn<A, V>):
    PipelineNext<A, {'options': V}, 'withTargetOptions' | 'resolveTargetOptions' | 'resolveTargetOptionsDefault'>;


  resolveTargetOptions<V extends PipeResolvedTargetOptions>(supplier: PipelineIn<A, V>):
    PipelineNext<A, {'options': V}, 'resolveTargetOptions' | 'interpret'>;

  resolveTargetOptionsDefault():
    PipelineNext<A, {'options': PipeResolvedTargetOptions}, 'interpret'>;


  interpret<V extends Interpreter>(supplier: PipelineIn<A, V>):
    PipelineNext<A, {'interpreter': V}, 'withLateModelTransformer' | 'withAstTransformer' | 'render'>;


  withLateModelTransformer(supplier: PipelineIn<A, void>):
    PipelineNext<A, {}, 'withLateModelTransformer' | 'withAstTransformer' | 'render'>;

  withAstTransformer(supplier: PipelineIn<A, void>):
    PipelineNext<A, {}, 'withAstTransformer' | 'render'>;


  render<V extends Renderer>(supplier: PipelineIn<A, V>):
    PipelineNext<A, {'renderer': V}, 'write'>;


  write(supplier: PipelineIn<A, void>):
    PipelineNext<A, {}, 'write' | 'build'>;


  build(): A;
}

export type PipelineFor<A> = {};
