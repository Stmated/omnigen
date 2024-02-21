// import {Interpreter, TargetFeatures, TargetOptions} from '../interpret';
// import {ModelTransformOptions, OmniModel, OmniModelTransformer, Parser, ParserOptions} from '../parse';
// import {AstTransformer} from '../transform';
// import {Renderer} from '../render';
// import {Writer} from '../write';
// import {SerializedInput} from '../input';
// import {IncomingOptions, RealOptions} from '../options';
// import {AstNode, RenderedCompilationUnit} from '../ast';
// import {z} from 'zod';

// export interface PipelineInputLoader {
//   load(runOptions: RunOptions): SerializedInput[];
// }

// export interface PipelineOptionsSource<T extends Options, P extends Pipeline> {
//   getIncomingOptions<Opt extends T>(pipeline: P): IncomingOptions<Opt> | undefined;
// }
//
// export interface PipelineOptionsParser<T extends Options, P extends Pipeline> {
//   getIncomingOptions<Opt extends T>(pipeline: P, options: IncomingOptions<Opt>): RealOptions<Opt> | undefined;
// }

/**
 * Take arguments given through the CLI and convert into this typed object.
 * It will then be used to execute the plugin manager, by running the registered plugins.
 * The Plugin Manager will fail if it cannot properly handle the options that were given to it.
 */
// export interface RunOptions {
//
//   input: string | string[];
//   output?: string | undefined;
//   types: string[];
// }

// TODO: Should each step be built with some form of callback system?
//        Where we can return a pipeline from a method, and say "call me back when this is handled, with safe types"

// export interface CompilationUnitResolver {
//
//   resolve(node: AstNode): PipelineCompilationUnit[];
// }

// export interface PipelineCompilationUnit {
//   node: AstNode;
//   fileName: string;
// }

// export interface PipelineValue<T, P> {
//
//   value: T;
//   onExecution: (pipeline: P) => void;
// }

// export interface Pipeline<
//   TParserOptions extends ParserOptions = ParserOptions,
//   TModelTransformOptions extends ModelTransformOptions = ModelTransformOptions,
//   TTargetOptions extends TargetOptions = TargetOptions
// > {
//
//   run: RunOptions;
//   inputLoaders: PipelineInputLoader[];
//   input: SerializedInput[];
//   // parserOptionsSources: PipelineOptionsSource<ParserOptions, Pipeline>[];
//   // parserOptionsParser: PipelineOptionsParser<ParserOptions, Pipeline>[];
//   incomingParserOptions?: IncomingOptions<TParserOptions>;
//   parserOptions?: RealOptions<TParserOptions>;
//   parsers: Parser[];
//   model?: OmniModel;
//   incomingModelTransformOptions?: IncomingOptions<TModelTransformOptions>;
//   modelTransformOptions?: RealOptions<TModelTransformOptions>;
//   modelTransformers: OmniModelTransformer[];
//   // targetOptionsSources: PipelineOptionsSource<TargetOptions, Pipeline>[];
//   // targetOptionsParser: PipelineOptionsParser<TargetOptions, Pipeline>[];
//   incomingTargetOptions?: IncomingOptions<TTargetOptions>;
//   targetOptions?: RealOptions<TTargetOptions>;
//   interpreters: Interpreter[];
//   node?: AstNode;
//   features?: TargetFeatures;
//   astTransformers: AstTransformer[];
//   compilationUnitResolvers: CompilationUnitResolver[];
//   compilationUnits: PipelineCompilationUnit[];
//   renderers: Renderer[];
//   rendered: RenderedCompilationUnit[];
//   writers: Writer[];
// }
