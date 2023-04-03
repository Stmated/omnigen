import {
  PipeInitialOptions,
  Pipeline,
  PipelineArgs,
  PipelineBackDelegator,
  PipelineBackDelegatorAware,
  PipelineBackDelegatorInterface,
  PipelineCustomizer,
  PipelineIn,
  PipeParserOptions,
  PipeResolvedModelTransformOptions,
  PipeResolvedTargetOptions,
  PipeTargetOptions,
  Plugin,
  PluginAutoRegistry,
  PluginBoot,
  PluginHook,
  PluginQualifier,
} from '@omnigen/core-plugin';
import {
  DEFAULT_MODEL_TRANSFORM_OPTIONS,
  DEFAULT_PARSER_OPTIONS,
  DEFAULT_TARGET_OPTIONS,
  Interpreter,
  OmniModel,
  OmniModelTransformer,
  Renderer,
  RunOptions,
  SerializedInput,
} from '@omnigen/core';
import {
  OptionsUtil,
  PARSER_OPTIONS_RESOLVERS,
  TARGET_OPTION_RESOLVERS,
  TRANSFORM_OPTIONS_RESOLVER,
} from '@omnigen/core-util';
import * as path from 'path';

interface ImportedPlugin {
  qualifier: PluginQualifier;
  plugin: Plugin;
}

export interface PluginManagerOptions {
  includeAuto?: boolean;
}

export class PluginManager {

  private readonly _pluginBoots: PluginBoot[] = [];
  private readonly _plugins = new Map<string, ImportedPlugin>();
  private readonly _options: Required<PluginManagerOptions>;

  constructor(options: PluginManagerOptions = {}) {
    this._options = {
      includeAuto: options.includeAuto ?? true,
    };
  }

  public addPluginBoot(pluginBoot: PluginBoot): void {
    this._pluginBoots.push(pluginBoot);
  }

  public async importPlugin(qualifier: PluginQualifier): Promise<boolean> {

    if (!qualifier.name) {
      qualifier.name = qualifier.packageName;
    }

    if (!qualifier.name || !qualifier.packageName) {
      return Promise.reject(new Error('The plugin name or package are required'));
    }

    if (this._plugins.has(qualifier.name)) {
      return Promise.reject(new Error(`Cannot add existing plugin ${qualifier.name}`));
    }

    try {

      // Try to load the plugin
      const packageContents = await import(qualifier.packageName);

      // TODO: Check if "default" exists and if it is an init function -- then use that.
      if ('init' in packageContents) {

        const init = packageContents.init;
        if (typeof init == 'function') {

          const hookCreator = init as PluginBoot;
          const globalAutoPlugins = PluginAutoRegistry.getGlobalAutoPlugins();

          if (globalAutoPlugins.find(it => it.init == hookCreator)) {
            return Promise.reject(new Error(`No reason to import plugin that was auto-imported (found by hook init method)`));
          }

          if (globalAutoPlugins.find(it => it.name == qualifier.name)) {

            // TODO: This should be improved, so it checks for other combinations of names
            //        For example "@omnigen/target-java", "@omnigen/java", "target-java", "java" etc
            //        Or create a defined and exact naming strategy that must be followed for the plugins
            return Promise.reject(new Error(`No reason to import plugin that was auto-imported (found by plugin name)`));
          }

          this._plugins.set(qualifier.name, {
            qualifier: qualifier,
            plugin: {
              name: qualifier.name,
              init: hookCreator,
            },
          });

          return Promise.resolve(true);

        } else {
          return Promise.reject(new Error(`Imported 'init' member must be a function`));
        }
      } else {
        return Promise.reject(new Error(`There is no 'init' exported member inside imported package '${qualifier.packageName}'`));
      }

    } catch (error) {
      const resolvedPath = path.resolve(qualifier.packageName);
      return Promise.reject(new Error(`Cannot load plugin ${qualifier.name} (${resolvedPath}): ${error}`));
    }
  }

  public execute(runOptions: RunOptions): PipelineArgs[] {

    const importedPlugins = [...this._plugins.values()].map(it => it.plugin);

    const plugins = [...importedPlugins];
    if (this._options.includeAuto) {

      const globalAutoPlugins = PluginAutoRegistry.getGlobalAutoPlugins();
      plugins.push(...globalAutoPlugins);
    }

    const customizers: PipelineCustomizer[] = [];
    const hook: PluginHook = {
      registerCustomizer(customizer) {
        customizers.push(customizer);
      },
    };

    for (const plugin of plugins) {
      plugin.init(hook);
    }

    for (const pluginBoot of this._pluginBoots) {
      pluginBoot(hook);
    }

    const pipelineFactory = new PipelineFactory();
    const pipeline = pipelineFactory.create(() => runOptions, customizers);
    const pipelineWithDelegator = pipelineFactory.exposeDelegator(pipeline);

    // We call the first step of the pipeline.
    // It is then up to the delegator to send us along to the appropriate plugin/base functionality.
    pipelineWithDelegator.delegateBack().start(runOptions);

    // TODO: Figure out how to continue here... there must be a GOOD way to make sure we are called back to the right next step.
    //        Send back the pipeline from the customizer?
    //        Send back method reference from the customizer?
    //        Call some "next" method where we give the current builder, and the target method must match requirements?

    return [];
  }
}

export class PipelineFactory {

  public create<A extends PipelineArgs = PipelineArgs>(supplier: () => RunOptions, customizers: PipelineCustomizer[] = []): Pick<Pipeline<Pick<A, 'run'>>, 'from'> {

    const step: PropertyPipeStep<A, 'run'> = {
      key: 'run',
      step: () => supplier(),
    };

    return new PipelineImpl<A>(step, customizers);
  }

  public exposeBuilder<A, P extends Partial<Pipeline<A>>>(pipeline: P): WithExposedBuild<A, P> {
    if (pipeline instanceof PipelineImpl) {
      return pipeline as unknown as WithExposedBuild<A, P>;
    } else {
      throw new Error(`The pipeline must be created by this factory`);
    }
  }

  public exposeDelegator<A, P extends Partial<Pipeline<A>>>(pipeline: P): PipelineBackDelegatorAware<A> {
    if (pipeline instanceof PipelineImpl) {
      return pipeline;
    } else {
      throw new Error(`The pipeline must be created by this factory`);
    }
  }
}

export type WithExposedBuild<A, P extends Partial<Pipeline<A>>> = P extends Partial<Pipeline<infer RA>>
  ? P & { build: { (): RA } }
  : never;

interface PropertyPipeStep<A extends PipelineArgs, K extends keyof A, I extends PipelineIn<A, A[K]> = PipelineIn<A, A[K]>> {

  readonly step: I;
  readonly key: (K & string) | undefined;
}

class PipelineImpl<A extends PipelineArgs = PipelineArgs> implements Pipeline<A>, PipelineBackDelegatorAware<A> {

  // We lie. We trust that the end-user of the builder cannot create a type-unsafe builder because of chaining.
  private readonly _steps: PropertyPipeStep<A, keyof PipelineArgs, PipelineIn<A, any>>[] = [];
  private readonly _pipelineDelegator: PipelineBackDelegatorImpl<A>;
  readonly customizers: PipelineCustomizer[];

  constructor(runStep: PropertyPipeStep<A, 'run'>, customizers: PipelineCustomizer[]) {
    this._steps.push(runStep);
    this.customizers = customizers;
    this._pipelineDelegator = new PipelineBackDelegatorImpl<A>(this);
  }

  public addStep(step: PropertyPipeStep<A, keyof PipelineArgs, PipelineIn<A, any>>): void {
    this._steps.push(step);
  }

  public delegateBack(): PipelineBackDelegator<A> {
    return this._pipelineDelegator;
  }

  public build(): A {

    // We lie, and act as if this is the full object.
    // To the outward user of the builder, it will look like another type based on the steps taken.
    const args: A = {
      modelTransformers: [] as OmniModelTransformer[],
    } as A;

    for (const step of this._steps) {

      const result = step.step(args);
      if (step.key && result) {
        const target = args[step.key];
        args[step.key] = Array.isArray(target) ? [...target, result] : result;
      }
    }

    // TODO: Do sanity check?

    return args as A;
  }

  start<V extends RunOptions>(supplier: PipelineIn<A, V>) {
    this._steps.push({key: 'run', step: supplier});
    return this as any;
  }

  from<V extends SerializedInput>(supplier: PipelineIn<A, V>) {
    this._steps.push({step: supplier, key: 'input'});
    return this as any;
  }

  deserialize<V>(supplier: PipelineIn<A, V>) {
    this._steps.push({step: supplier, key: 'deserialized'});
    return this as any;
  }

  withOptions<V extends PipeInitialOptions>(supplier: PipelineIn<A, V>) {
    this._steps.push({step: supplier, key: 'options'});
    return this as any;
  }

  resolveOptions<V extends PipeParserOptions>(supplier: PipelineIn<A, V>) {
    this._steps.push({step: supplier, key: 'options'});
    return this as any;
  }

  resolveParserOptionsDefault<V extends PipeParserOptions>() {
    this._steps.push({
      step: a => OptionsUtil.resolve(DEFAULT_PARSER_OPTIONS, a.options, PARSER_OPTIONS_RESOLVERS),
      key: 'options',
    });
    return this as any;
  }

  parse<V extends OmniModel>(supplier: PipelineIn<A, V>) {
    this._steps.push({step: supplier, key: 'options'});
    return this as any;
  }

  resolveTransformOptions<V extends PipeResolvedModelTransformOptions>(supplier: PipelineIn<A, V>) {
    this._steps.push({step: supplier, key: 'options'});
    return this as any;
  }

  resolveTransformOptionsDefault() {
    this._steps.push({
      step: a => OptionsUtil.resolve(DEFAULT_MODEL_TRANSFORM_OPTIONS, a.options, TRANSFORM_OPTIONS_RESOLVER),
      key: 'options',
    });
    return this as any;
  }

  withModelTransformer<V extends OmniModelTransformer>(supplier: PipelineIn<A, V>) {
    this._steps.push({step: supplier, key: 'modelTransformers'});
    return this as any;
  }

  withTargetOptions<V extends PipeTargetOptions>(supplier: PipelineIn<A, V>) {
    this._steps.push({step: supplier, key: 'options'});
    return this as any;
  }

  resolveTargetOptions<V extends PipeResolvedTargetOptions>(supplier: PipelineIn<A, V>) {
    this._steps.push({step: supplier, key: 'options'});
    return this as any;
  }

  resolveTargetOptionsDefault<V extends PipeResolvedTargetOptions>() {
    this._steps.push({
      step: a => OptionsUtil.resolve(DEFAULT_TARGET_OPTIONS, a.options, TARGET_OPTION_RESOLVERS),
      key: 'options',
    });
    return this as any;
  }

  interpret<V extends Interpreter>(supplier: PipelineIn<A, V>) {
    this._steps.push({step: supplier, key: 'interpreter'});
    return this as any;
  }

  withLateModelTransformer(supplier: PipelineIn<A, void>) {
    this._steps.push({step: supplier, key: undefined});
    return this as any;
  }

  withAstTransformer(supplier: PipelineIn<A, void>) {
    this._steps.push({step: supplier, key: undefined});
    return this as any;
  }

  render<V extends Renderer>(supplier: PipelineIn<A, V>) {
    this._steps.push({step: supplier, key: 'renderer'});
    return this as any;
  }

  write(supplier: PipelineIn<A, void>) {
    this._steps.push({step: supplier, key: undefined});
    return this;
  }
}

class PipelineBackDelegatorImpl<A extends PipelineArgs = PipelineArgs> implements PipelineBackDelegatorInterface<A> {

  private readonly _impl: PipelineImpl<A>;

  constructor(impl: PipelineImpl<A>) {
    this._impl = impl;
  }

  start(runOptions: RunOptions) {

    // TODO: Call suitable customizer, or fallback on whatever fallback we might have.
    //        This should be implemented for each step, or throw exception if not applicable!
    //        This is the most important functionality of the whole pipeline, and has to Get Good!

    // TODO: There needs to be support here for splitting the processing into different parts?
    //        Not sure when that should happen, so just implement it when the need arises!

    for (const customizer of this._impl.customizers) {

    }

    this._impl.start(() => runOptions);
  }

  from(runOptions: RunOptions) {
    throw new Error(`Cannot continue with this step`);
  }

  deserialize(runOptions: RunOptions) {
    throw new Error(`Cannot continue with this step`);
  }

  withOptions(runOptions: RunOptions) {

  }

  resolveOptions(runOptions: RunOptions) {

  }

  parse(runOptions: RunOptions) {

  }

  resolveTransformOptionsDefault(runOptions: RunOptions) {

  }

  withModelTransformer(runOptions: RunOptions) {

  }

  resolveParserOptionsDefault(runOptions: RunOptions) {

  }

  withTargetOptions(runOptions: RunOptions) {

  }

  resolveTargetOptions(runOptions: RunOptions) {

  }

  resolveTargetOptionsDefault(runOptions: RunOptions) {

  }

  resolveTransformOptions(runOptions: RunOptions) {

  }

  interpret(runOptions: RunOptions) {

  }

  withAstTransformer(runOptions: RunOptions) {

  }

  withLateModelTransformer(runOptions: RunOptions) {

  }

  render(runOptions: RunOptions) {

  }

  write(runOptions: RunOptions) {

  }

  build(runOptions: RunOptions) {

    // No-op? Or this is what should actually execute all pipeline steps?
  }
}
