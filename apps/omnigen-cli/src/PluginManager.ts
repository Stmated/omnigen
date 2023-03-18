import {
  PluginHookCreator,
  PluginQualifier,
  RunOptions,
  Plugin,
  PluginAutoRegistry,
  PipelineBuilder,
  PipelineBuilderWithInput,
  PluginHook,
  PipelineBuilderWithDeserializer,
  PipelineBuilderWithParser,
  PipelineBuilderWithRenderer,
  SerializedInputSourceCreator,
  SerializedInputDeserializerCreator,
  ParserCreator,
  RendererCreator,
  WriterCreator,
  ModelTransformerCreator,
  OptionsParserCreator,
  SmartPipelineBuilderWithInterpreter,
  InterpreterCreator, SmartPipelineBuilderWithParserOptions, ModelTransformer2Creator, AstTransformerCreator,
} from '@omnigen/core-plugin';
import {ParserOptions, Pipeline} from '@omnigen/core';
import * as path from 'path';

interface ImportedPlugin {
  qualifier: PluginQualifier;
  plugin: Plugin;
}

export class PluginManager {

  private readonly _plugins = new Map<string, ImportedPlugin>();

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

          const hookCreator = init as PluginHookCreator;
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

  public async createPipelines(runOptions: RunOptions): Promise<Pipeline[]> {

    const importedPlugins = [...this._plugins.values()].map(it => it.plugin);
    const globalAutoPlugins = PluginAutoRegistry.getGlobalAutoPlugins();

    // Get all inputs
    // Get all parsers
    // Deserialize inputs with help of parser

    const plugins = [...importedPlugins, ...globalAutoPlugins];

    const rootBuilder = new UnsafePipelineBuilder();

    const pluginHooks = plugins.map(it => it.init({qualifier: {name: it.name}, args: {}}));

    for (const pluginHook of pluginHooks) {
      if (pluginHook.entry) {
        pluginHook.entry(runOptions, rootBuilder);
      }
    }

    for (const builder of rootBuilder.getEdges()) {
      for (const pluginHook of pluginHooks) {
        if (pluginHook.beforeParse) {
          pluginHook.beforeParse(runOptions, builder);
        }
      }
    }

    for (const builder of rootBuilder.getEdges()) {
      for (const pluginHook of pluginHooks) {
        if (pluginHook.afterParse) {
          pluginHook.afterParse(runOptions, builder);
        }
      }
    }

    // TODO: REDO THE WHOLE SYSTEM! DO NOT HAVE CREATORS AND INSTEAD JUST GIVE THE ACTUAL INPUT AND EXPECT DIRECT OUTPUT
    //        THE BUILDER IS THE PIPELINE! The PipelineBuilder should be a merged type of all steps!
    //        It is then up to each plugin to return the builder at any stage it wants!
    //        Then we check up to what stage that there are methods defined!
    //        Then we call into into a method of the next plugin to continue building on it!
    //        If possible, it would be *awesome* if this could be automated somehow
    //            -- by getting the keys and values, and auto-adding the "before" and "after" hooks into the PluginHook

    const pipelines: Pipeline[] = [];

    for (const builder of rootBuilder.getEdges()) {

      // TODO: For each edge, we will need to fill in the missing parts of the pipeline.
      // TODO: When we have the builder fully populated, we will create the pipeline
      if (!builder.serializedInputSourceCreator) {
        throw new Error(`There is no input source`);
      }

      if (!builder.serializedInputDeserializerCreator) {
        throw new Error(`There is no deserializer`);
      }

      if (!builder.parserCreator) {
        throw new Error(`There is no parser creator`);
      }

      const safeBuilder = builder as Required<UnsafePipelineBuilder>;

      const deserializer = builder.serializedInputDeserializerCreator();
      const serializedInputSource = builder.serializedInputSourceCreator();
      const inputs = serializedInputSource.inputs;

      const deserializedInputs = inputs.map(it => deserializer.deserialize(it));

      const parsers = deserializedInputs.map(it => {
        const optionsParser = safeBuilder.optionsParserCreator(it);
        const options = optionsParser.parse({}); // TODO: Send anything along here?
        return safeBuilder.parserCreator(it, options);
      });

      pipelines.push({
        input: serializedInputSource.inputs,

      });
    }

    return pipelines;
  }

  public async executePipelines(pipelines: Pipeline[]): Promise<void> {

    for (const batch of pipelines) {

      // TODO: Actually run everything. In sequence. Then return when everything is done.
    }
  }
}

class UnsafePipelineBuilder implements PipelineBuilder {

  serializedInputSourceCreator?: SerializedInputSourceCreator;
  serializedInputDeserializerCreator?: SerializedInputDeserializerCreator;
  optionsParserCreator?: OptionsParserCreator;
  parserCreator?: ParserCreator;
  modelTransformerCreators: ModelTransformerCreator[] = [];
  interpreterCreator?: InterpreterCreator;
  modelTransformer2Creators: ModelTransformer2Creator[] = [];
  astTransformerCreators: AstTransformerCreator[] = [];
  rendererCreator?: RendererCreator;
  writerCreator?: WriterCreator;

  private readonly _forks: UnsafePipelineBuilder[] = [];

  private clone(): this {

    const clone = new UnsafePipelineBuilder();

    clone.serializedInputSourceCreator = this.serializedInputSourceCreator;
    clone.serializedInputDeserializerCreator = this.serializedInputDeserializerCreator;
    clone.optionsParserCreator = this.optionsParserCreator;
    clone.parserCreator = this.parserCreator;
    clone.modelTransformerCreators = [...this.modelTransformerCreators];
    clone.interpreterCreator = this.interpreterCreator;
    clone.modelTransformer2Creators = [...this.modelTransformer2Creators];
    clone.astTransformerCreators = [...this.astTransformerCreators];
    clone.rendererCreator = this.rendererCreator;
    clone.writerCreator = this.writerCreator;

    return clone as this;
  }

  getEdges(): UnsafePipelineBuilder[] {
    if (this._forks.length == 0) {
      return [this];
    } else {
      return this._forks.flatMap(it => it.getEdges());
    }
  }

  fork(): this {

    const forked = this.clone();
    this._forks.push(forked);

    return forked;
  }

  from(sourceCreator: SerializedInputSourceCreator): PipelineBuilderWithInput {
    this.serializedInputSourceCreator = sourceCreator;
    return this;
  }

  thenDeserialize(creator: SerializedInputDeserializerCreator): PipelineBuilderWithDeserializer {
    this.serializedInputDeserializerCreator = creator;
    return this;
  }

  thenParseOptions<TCreator extends OptionsParserCreator>(creator: TCreator): SmartPipelineBuilderWithParserOptions<any, TCreator> {
    this.optionsParserCreator = creator;
    return this as SmartPipelineBuilderWithParserOptions<any, TCreator>;
  }

  thenParse(creator: ParserCreator): PipelineBuilderWithParser {
    this.parserCreator = creator;
    return this;
  }

  withModelTransformer(creator: ModelTransformerCreator): this {
    this.modelTransformerCreators.push(creator);
    return this;
  }

  thenInterpret<TCreator extends InterpreterCreator>(creator: TCreator): SmartPipelineBuilderWithInterpreter<ParserOptions, TCreator> {
    this.interpreterCreator = creator;
    return this as unknown as SmartPipelineBuilderWithInterpreter<ParserOptions, TCreator>;
  }

  withModelTransformer2(creator: ModelTransformer2Creator): this {
    this.modelTransformer2Creators.push(creator);
    return this;
  }

  withAstTransformer(creator: AstTransformerCreator): this {
    this.astTransformerCreators.push(creator);
    return this;
  }

  thenRender(creator: RendererCreator): PipelineBuilderWithRenderer {
    this.rendererCreator = creator;
    return this;
  }

  thenWrite(creator: WriterCreator): void {
    this.writerCreator = creator;
  }
}
