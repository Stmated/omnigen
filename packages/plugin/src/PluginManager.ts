import {ActionKind, Plugin2, Plugin2ExecuteResult, PluginAutoRegistry, PluginOrPlugins, PluginQualifier, PluginScoreKind} from '@omnigen/core-plugin';
import * as ioPath from 'path';
import {LoggerFactory} from '@omnigen/core-log';
import {AnyZodObject, z, ZodError, ZodObject, ZodType} from 'zod';
import {Compat, CompatResult, ZodUtils} from './ZodUtils';
import {PluginUtil} from './PluginUtil';

const logger = LoggerFactory.create(import.meta.url);

interface ImportedPlugin {
  qualifier: PluginQualifier;
  plugin: Plugin2;
}

export interface PluginManagerOptions {
  includeAuto?: boolean;
}

export class PluginManager {

  private readonly _pluginImports = new Map<string, ImportedPlugin>();
  private readonly _plugins: Plugin2[] = [];
  private readonly _options: Required<PluginManagerOptions>;

  constructor(options: PluginManagerOptions = {}) {
    this._options = {
      includeAuto: options.includeAuto ?? true,
    };
  }

  public addPlugin(plugins: PluginOrPlugins): void {
    if (Array.isArray(plugins)) {
      this._plugins.push(...plugins);
    } else {
      this._plugins.push(plugins);
    }
  }

  public createPlugin<In extends ZodType, Out extends ZodType>(
    name: string,
    inType: In,
    outType: Out,
    execute: (ctx: z.output<In>) => Plugin2ExecuteResult<Out>,
  ): Plugin2<In, Out> {

    const plugin: Plugin2<In, Out> = {
      name: name,
      input: inType,
      output: outType,
      score: PluginScoreKind.SUITABLE,
      execute: execute,
    };

    this.addPlugin(plugin);

    return plugin;
  };

  public async importPlugin(qualifier: PluginQualifier): Promise<boolean> {

    if (!qualifier.name && qualifier.packageName) {
      qualifier.name = qualifier.packageName;
    }

    if (!qualifier.name || !qualifier.packageName) {
      return Promise.reject(new Error('The plugin name or package are required'));
    }

    if (this._pluginImports.has(qualifier.name)) {
      return Promise.reject(new Error(`Cannot add existing plugin ${qualifier.name}`));
    }

    try {

      // Try to load the plugin. This is all *very* ugly, but temporary until core functionality is stable.
      logger.info(`Importing ${qualifier.packageName}`);
      const packageContents = await import(`@omnigen/${qualifier.packageName}`)
        .catch(e => {
          logger.info(process.cwd());
          const resolved = ioPath.resolve(`../../packages/${qualifier.packageName}/src/index.ts`);
          logger.info(`1: ${qualifier.packageName} @ ${resolved}} (${e})`);
          return import(resolved);
        })
        .catch(e => {
          logger.info(process.cwd());
          const resolved = ioPath.resolve(`../../packages/parser-${qualifier.packageName}/src/index.ts`);
          logger.info(`2: ${qualifier.packageName} @ ${resolved} (from attempt 1: ${e})`);
          return import(resolved);
        })
        .catch(e => {
          logger.info(process.cwd());
          const resolved = ioPath.resolve(`../../packages/target-${qualifier.packageName}/src/index.ts`);
          logger.info(`3: ${qualifier.packageName} @ ${resolved} (from attempt 2: ${e})`);
          return import(resolved);
        })
      ;

      // TODO: Check if "default" exists and if it is an init function -- then use that.
      if ('init' in packageContents) {

        const init = packageContents.init;
        if (typeof init == 'function') {

          const foundPluginSet = init() as PluginOrPlugins;
          const foundPlugins = Array.isArray(foundPluginSet) ? foundPluginSet : [foundPluginSet];

          const globalAutoPlugins = PluginAutoRegistry.getGlobalAutoPlugins();

          for (const foundPlugin of foundPlugins) {

            if (globalAutoPlugins.find(it => it.name == foundPlugin.name)) {
              return Promise.reject(new Error(`No reason to import plugin that was auto-imported (found by hook init method)`));
            }

            this._pluginImports.set(foundPlugin.name, {
              qualifier: qualifier,
              plugin: foundPlugin,
            });
          }

          return Promise.resolve(true);

        } else {
          return Promise.reject(new Error(`Imported 'init' member must be a function`));
        }
      } else {
        logger.info(`No 'init' inside imported plugin ${qualifier.packageName}, likely the plugin auto-registered itself`);
        return true;
      }

    } catch (error) {
      const resolvedPath = ioPath.resolve(qualifier.packageName);
      return Promise.reject(new Error(`Cannot load plugin ${qualifier.name} (${resolvedPath}): ${error}`));
    }
  }

  public getPlugins(): Plugin2[] {

    const plugins = [...this._pluginImports.values().map(it => it.plugin)];
    plugins.push(...this._plugins);

    if (this._options.includeAuto) {

      const globalAutoPlugins = PluginAutoRegistry.getGlobalAutoPlugins();
      plugins.push(...globalAutoPlugins);
    }

    return plugins;
  }

  public async execute<C extends z.infer<ZodObject<any>>, S extends ZodObject<any>>(args: ExecArgs<C, S>): Promise<ExecResults<S>> {

    const rootPath = this.findExecutionPath({
      inCtx: args.ctx,
      debug: args.debug,
      skip: args.skip,
    });

    const pluginsStr = [...new Set(this.getPluginNames(rootPath.path))].join(', ');
    logger.info(`Will execute ${rootPath.length - 1} plugins: ${pluginsStr}`);

    const executed = await this.executeFromItemOnwards({
      inType: rootPath.inType,
      inCtx: args.ctx,
      item: rootPath.path,
      stopAt: args.stopAt,
    });

    if (executed.results.length == 0) {
      throw new Error(`There was no plugin execution path found, skipped: ${JSON.stringify(rootPath.skipped)}`);
    }

    const lastResult = executed.results[executed.results.length - 1];

    if (args.stopAt) {

      type OutType = z.output<typeof args.stopAt>;
      let parsedLastResult: OutType;
      try {
        parsedLastResult = args.stopAt.parse(lastResult.ctx) as OutType;
      } catch (ex) {
        const message = (ex instanceof Error) ? ex.message : `${ex}`;
        const ctxString = PluginUtil.getShallowPayloadString(lastResult.ctx);
        throw new Error(
          `-- Told to stop at:
${JSON.stringify(args.stopAt, undefined, '  ')}
-- But did not match (because probably exited early):
${ctxString}
-- Because: ${message}
-- Message: ${executed.message}
-- Last Plugin: ${lastResult.plugin.name}
-- Plugins: ${pluginsStr}`,
          {cause: ex},
        );
      }

      return {
        results: executed.results,
        result: {
          plugin: lastResult.plugin,
          ctx: parsedLastResult,
        },
        skipped: rootPath.skipped,
        stoppedAt: executed.stoppedAt,
      };

    } else {

      return {
        results: executed.results,
        result: lastResult,
        skipped: rootPath.skipped,
        stoppedAt: executed.stoppedAt,
      };
    }
  }

  private getPluginNames(root: RootPluginPathItem): string[] {

    const names: string[] = [];
    if (root.next.length > 0) {
      for (const next of root.next) {
        names.push(`${next.plugin.name}${next.needsEvaluation ? '?' : ''}`);
        names.push(...this.getPluginNames(next));
      }
    } else {
      names.push('done');
    }

    return names;
  }

  public async executeFromItemOnwards<
    Z extends ZodObject<any>,
    C extends z.infer<Z>,
    S extends ZodObject<any>
  >(
    args: ExecutePathArgs<Z, C, S>,
  ): Promise<ExecItemResults<S>> {

    if (args.stopAt) {
      if (ZodUtils.isCompatibleWith(args.stopAt, args.inType).v == Compat.SAME) {
        return {
          results: [],
          stoppedAt: {
            inCtx: args.inCtx,
            inType: args.inType as unknown as S,
            item: args.item,
            stopAt: undefined,
          },
        };
      }
    }

    if ('plugin' in args.item) {

      const pathItem = args.item;
      const needsEvaluation = PluginManager.needsEvaluation(pathItem);
      if (needsEvaluation) {

        // TODO: Fix so that the literal creation cannot end up in endless recursion! But first try to figure out a way of getting a proper exception, for any future errors!!

        const zodRuntimeSchema = ZodUtils.createZodSchemaFromObject(
          args.inCtx, true,
          ({keyPath}) => keyPath[0] == 'model' ? z.record(z.any()) : undefined,
        );

        const compat = ZodUtils.isCompatibleWith(pathItem.plugin.input, zodRuntimeSchema);
        if (compat.v == Compat.DIFF) {

          logger.debug(`Skipping '${pathItem.plugin.name}' since current context did not match expected input validation schema: ${compat.error?.message}`);
          return {results: []};
        }
      }

      logger.info(`Executing '${pathItem.plugin.name}'${pathItem.needsEvaluation ? ', possibly not continuing' : ''}`);
      const result = await pathItem.plugin.execute(args.inCtx);
      if (result instanceof ZodError) {

        const message = JSON.stringify(result.flatten().fieldErrors);

        if (needsEvaluation) {
          logger.warn(`Skipping '${pathItem.plugin.name}' since runtime context did not match: ${message}`);
          return {results: [], message: message};
        } else {
          throw new Error(`Invalid '${pathItem.plugin.name}' execution, because: ${message}`);
        }
      }

      const mergedContext = {...args.inCtx, ...result};
      const mergedType = (args.inType as ZodObject<any>).merge(pathItem.plugin.output as ZodObject<any>);

      const executionResult: ExecItemResult = {
        plugin: pathItem.plugin,
        ctx: mergedContext,
      };

      const messages: string[] = [];
      for (let n = 0; n < pathItem.next.length; n++) {

        const next = pathItem.next[n];

        const newExecution = await this.executeFromItemOnwards({
          ...args,
          inType: mergedType,
          inCtx: mergedContext,
          item: next,
        });

        if (newExecution.results.length > 0 || newExecution.stoppedAt) {
          return {results: [executionResult, ...newExecution.results], stoppedAt: newExecution.stoppedAt, message: newExecution.message};
        } else {
          if (newExecution.message) {
            messages.push(newExecution.message);
          }
        }
      }

      return {results: [executionResult], message: (messages.length > 0 ? messages.join(', ') : undefined)};

    } else {

      for (let n = 0; n < args.item.next.length; n++) {

        const next = args.item.next[n];
        const newExecution = await this.executeFromItemOnwards({
          ...args,
          item: next,
        });

        if (newExecution.results.length > 0 || newExecution.stoppedAt) {
          return newExecution;
        }
      }
    }

    return {results: []};
  }

  public findExecutionPath<Z extends ZodObject<any>, C extends z.infer<Z>>(args: FindPathArgs<Z, C>): FindPathResult<Z> {

    const startType = args.inType ?? ZodUtils.createZodSchemaFromObject(args.inCtx, true);
    const plugins = this.getPlugins();

    const skipped: Record<string, string> | undefined = args.debug ? {} : undefined;

    const matchItem: RootPluginPathItem = {score: 0, next: []};

    for (let i = 0; i < plugins.length; i++) {

      const plugin = plugins[i];
      const remaining = [...plugins];
      remaining.splice(i, 1);

      const item = this.findExecutionPathsInner({
        plugin: plugin,
        plugins: remaining,
        inType: startType as AnyZodObject,
        path: [plugin.name],
        skipped: skipped,
      });

      if (item) {
        matchItem.next.push(item);
      }
    }

    if (plugins.length > 0) {
      PluginManager.prune(plugins[0], matchItem, [plugins[0].name]);
    }

    return {
      path: matchItem,
      length: PluginManager.getLength(matchItem),
      inType: startType as Z,
      skipped: skipped,
    };
  }

  private findExecutionPathsInner<Z extends ZodObject<any>>(args: FindPathInnerArgs<Z>): PluginPathItem | undefined {

    const compat = ZodUtils.isCompatibleWith(args.plugin.input, args.inType);

    if (compat.v === Compat.DIFF) {

      const message = PluginManager.getCompatErrorMessage(compat);
      logger.silent(`Skipping ${args.path.join(' > ')} because: ${message}`);

      if (args.skipped) {
        args.skipped[args.path.join('>')] = message;
      }

      return undefined;
    }

    const matchItem: PluginPathItem = {
      plugin: args.plugin,
      compat: compat,
      score: args.plugin.score,
      needsEvaluation: (compat.v == Compat.NEEDS_EVALUATION),
      next: [],
    };

    const merged = (args.inType as ZodObject<any>).merge(matchItem.plugin.output as ZodObject<any>);

    for (let i = 0; i < args.plugins.length; i++) {

      const nextPlugin = args.plugins[i];
      const remaining = [...args.plugins];
      remaining.splice(i, 1);

      const next = this.findExecutionPathsInner(
        {...args, plugin: nextPlugin, inType: merged, plugins: remaining, path: [...args.path, nextPlugin.name]},
      );

      if (next) {
        matchItem.next.push(next);
      }
    }

    PluginManager.prune(args.plugin, matchItem, args.path);

    return matchItem;
  }

  private static getLength(item: RootPluginPathItem | PluginPathItem): number {

    let longest = 0;
    for (const next of item.next) {
      const nextLength = this.getLength(next);
      if (nextLength > longest) {
        longest = nextLength;
      }
    }

    return 1 + longest;
  }

  private static prune(plugin: Plugin2, item: RootPluginPathItem | PluginPathItem, path: string[]): void {

    if (item.next.length > 1) {
      item.next.sort((a, b) => b.score - a.score);

      // We should not filter away any of the first plugins that needs evaluation, since any could be true.
      const firstWithoutEvalIdx = item.next.findIndex(it => !PluginManager.needsEvaluation(it));
      if (firstWithoutEvalIdx == 0) {

        // The best plugin is the first plugin without eval, no need for the rest.
        item.next = [item.next[0]];
      } else if (firstWithoutEvalIdx !== -1) {

        // We do have one without eval, but it is after some that needs eval. We keep the first without eval.
        item.next = item.next.splice(0, firstWithoutEvalIdx + 1);
      }
    }

    if (plugin.scoreModifier) {

      const parentLength = path.length - 1;
      const childLength = PluginManager.getLength(item);
      const count = parentLength + childLength;
      const modified = plugin.scoreModifier(plugin.score, count, path.length - 1);

      if (item.next.length > 0) {
        item.score = modified + item.next[0].score;
      }
    } else {

      if (item.next.length > 0) {
        item.score = plugin.score + item.next[0].score;
      }
    }
  }

  private static needsEvaluation(it: PluginPathItem) {
    return it.compat.v == Compat.NEEDS_EVALUATION || it.plugin.action == ActionKind.RUNTIME_REFINES || it.needsEvaluation;
  }

  private static getCompatErrorMessage(compat: CompatResult): string {

    let message: string | undefined;
    if (compat.error) {

      const errorMessages: string[] = [];

      for (const error of compat.error.errors) {
        if (error.message) {
          errorMessages.push(error.message);
        }
      }

      if (errorMessages.length > 0) {
        message = errorMessages.join(', ');
      }
    }

    if (message == undefined) {
      message = `Did not match requirements`;
    }

    return message;
  }
}

export interface ExecArgs<C extends z.infer<ZodObject<any>>, S extends ZodObject<any>> {
  ctx: C;
  stopAt?: S | undefined;
  debug?: boolean | undefined;
  skip?: string[] | undefined;
}

export interface FindPathArgs<Z extends ZodObject<any>, C extends z.infer<Z>> {
  inType?: Z;
  inCtx: C;
  debug?: boolean | undefined;
  skip?: string[] | undefined;
}

type FindPathInnerArgs<Z extends ZodObject<any>> = {
  inType: Z;
  debug?: boolean | undefined;
  path: string[];
  plugin: Plugin2;
  plugins: Plugin2[];
  skipped?: Record<string, string> | undefined;
}

export interface FindPathResult<Z extends ZodObject<any>> {
  inType: Z;
  path: RootPluginPathItem;
  length: number;
  skipped?: Record<string, string> | undefined;
}

export interface ExecResults<S extends ZodObject<any>> {
  results: ExecItemResult[];
  result: ExecItemResult<z.output<S>>;
  skipped: Record<string, string> | undefined;
  stoppedAt?: ExecutePathArgs<S, z.infer<S>, ZodObject<any>> | undefined;
}

interface PluginPathItem {
  plugin: Plugin2;
  compat: CompatResult;
  score: number;
  needsEvaluation: boolean;
  next: PluginPathItem[];
}

type RootPluginPathItem = Omit<PluginPathItem, 'plugin' | 'compat' | 'needsEvaluation'>;

export interface ExecItemResult<C extends any = any> {
  plugin: Plugin2;
  ctx: C;
}

export interface ExecItemResults<S extends ZodObject<any>> {
  results: ExecItemResult[];
  stoppedAt?: ExecutePathArgs<S, z.infer<S>, ZodObject<any>> | undefined;
  message?: string | undefined;
}

export interface ExecutePathArgs<Z extends ZodObject<any>, C extends z.infer<Z>, S extends ZodObject<any>> {
  inType: Z;
  inCtx: C;
  item: RootPluginPathItem | PluginPathItem;
  stopAt?: S | undefined;
}
