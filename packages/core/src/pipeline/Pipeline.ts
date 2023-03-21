import {Interpreter, TargetOptions} from '../interpret';
import {OmniModel, OmniModelTransformer, Parser, ParserOptions} from '../parse';
import {AstTransformer} from '../transform';
import {Renderer} from '../render';
import {Writer} from '../write';
import {SerializedInput} from '../input';
import {IncomingOptions, Options, RealOptions} from '../options';
import {AstNode} from '../ast';

export interface PipelineInputLoader {
  load(runOptions: RunOptions): SerializedInput[];
}

export interface PipelineOptionsSource<T extends Options, P extends Pipeline> {
  getIncomingOptions<Opt extends T>(pipeline: P): IncomingOptions<Opt> | undefined;
}

export interface PipelineOptionsParser<T extends Options, P extends Pipeline> {
  getIncomingOptions<Opt extends T>(pipeline: P, options: IncomingOptions<Opt>): RealOptions<Opt> | undefined;
}

/**
 * Take arguments given through the CLI and convert into this typed object.
 * It will then be used to execute the plugin manager, by running the registered plugins.
 * The Plugin Manager will fail if it cannot properly handle the options that were given to it.
 */
export interface RunOptions {

  input: string[];
  output?: string | undefined;
  types: string[];
}

export interface PipelineStep<T> {
  value: T;
  listeners: any[];
}


// TODO: Should each step be built with some form of callback system?
//        Where we can return a pipeline from a method, and say "call me back when this is handled, with safe types"

/**
 * A work pipeline that will result in an input and an output.
 * <br />
 * The different steps are not generic and are assumed to have been created in a typesafe manner by the PipelineBuilder.
 */
export interface Pipeline {
  run: RunOptions;
  inputLoaders: PipelineInputLoader[];
  input: SerializedInput[];
  parserOptionsSources: PipelineOptionsSource<ParserOptions, Pipeline>[];
  parserOptionsParser: PipelineOptionsParser<ParserOptions, Pipeline>[];
  parserOptions: RealOptions<ParserOptions>;
  parser: Parser;
  model: OmniModel;
  modelTransformers: OmniModelTransformer[];
  targetOptionsSources: PipelineOptionsSource<TargetOptions, Pipeline>[];
  targetOptionsParser: PipelineOptionsParser<TargetOptions, Pipeline>[];
  targetOptions: RealOptions<TargetOptions>;
  interpreter: Interpreter;
  node: AstNode;
  astTransformers: AstTransformer[];
  renderers: Renderer[];
  writers: Writer[];
}
