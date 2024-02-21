import fs from 'fs/promises';
import {ZodRunOptions} from './OmnigenOptions.js';
import {OmnigenResult} from './OmnigenResult.js';
import {LoggerFactory} from '@omnigen/core-log';
import {PathLike} from 'fs';
import * as path from 'path';
import * as os from 'os';
import {FileWriteOptions, Plugin2, PluginOrPlugins, ZodBaseContext, ZodFilesContext} from '@omnigen/core-plugin';
import {PluginManager} from '@omnigen/plugin';
import {z} from 'zod';

const logger = LoggerFactory.create(import.meta.url);

// TODO: Rewrite this whole class to use the PluginManager to execute things dynamically
//         Remove any hard-coded stuff that relates to options -- it should be dynamically/runtime evaluated
//         Simplify the available functions here so it is both more generic and easier to just execute
//
// TODO: There is likely a need for a ctx/local storage for types, with unique ids calculated based on full path/ref
//         Then it should be possible for different schemas to properly reference types between them

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

type Flatten<T> = UnionToIntersection<T extends Record<string, any> ? { [K in keyof T]: T[K]; }[keyof T] : never>;

type ExtractOptions<T> = {
  [K in keyof T as K extends `${infer _}Options` ? K : never]: T[K]
}

type ToPluginInput<P extends Plugin2> = P extends Plugin2<infer In>
  ? z.input<In>
  : never;

type ToPlugin<P> =
  P extends Array<infer Item>
    ? Item
    : P

/**
 * This makes `Go To Declaration` not work properly. Live with it for now. Look up option by search in your IDE.
 *
 * Works exactly like Partial<T>, but this way you get this nice comment.
 */
type Maybe<T> = {
  [K in keyof T]?: T[K];
};

type AdditionalProperties<T> = T & { [other: string]: any };

export type OmnigenOptions<P extends PluginOrPlugins> = AdditionalProperties<Maybe<Flatten<ExtractOptions<ToPluginInput<ToPlugin<P>>>>>>;

export interface OmnigenArgs<P extends PluginOrPlugins> {
  input: string | string[];
  types: string | string[];
  output: string;
  options: OmnigenOptions<P>;
}

const ZodRunContext = z.object({
  runOptions: ZodRunOptions,
});

const ZodOmnigenContext = ZodBaseContext
  .merge(ZodRunContext)
  .merge(ZodFilesContext);

type OmnigenContext = z.output<typeof ZodOmnigenContext>;

/**
 * Main entry class which handles the default use-case for all the conversion from schema to output.
 */
export class Omnigen {

  public async generateAndWriteToFile<P extends PluginOrPlugins>(args: OmnigenArgs<P>): Promise<void> {

    const partialFileWriteOptions: Partial<FileWriteOptions> = {
      outputDirBase: args.output,
    };

    const enhancedArgs: OmnigenArgs<P> = {
      ...args,
      options: {
        ...args.options,
        ...partialFileWriteOptions,
      },
    };

    // const fileWriteOptions = ZodFileWriteOptions.parse(enhancedArgs.options);
    // const fileWriter = new FileWriter(fileWriteOptions.outputDirBase);

    await this.generate(enhancedArgs);
  }

  public async generate<P extends PluginOrPlugins, O extends OmnigenOptions<P>>(options: O): Promise<OmnigenResult<O>[]> {

    const runOptions = ZodRunOptions.parse(options);

    runOptions.schemaDirBase = this.relativeToAbsolute(runOptions.schemaDirBase);

    logger.info(`Schema base dir: ${runOptions.schemaDirBase}`);

    const schemaFilePaths = await this.getFileNames(
      runOptions.schemaDirBase,
      runOptions.schemaPatternExclude,
      runOptions.schemaPatternInclude,
    );

    const pluginManager = new PluginManager({
      includeAuto: true,
    });

    const initialCtx: OmnigenContext = {
      arguments: options,
      runOptions: runOptions,
      files: schemaFilePaths,
    };

    // TODO: args.types --- Need to support multiple types... eventually. Do that later.

    const result = await pluginManager.execute({ctx: initialCtx});

    if (result.results.length == 0) {
      throw new Error(`Wutt`);
    }

    console.table(result);

    return [];
  }

  private relativeToAbsolute(relative: string): string {

    const homeDirectory = os.homedir();
    const homeResolved = homeDirectory ? relative.replace(/^~(?=$|\/|\\)/, homeDirectory) : relative;
    logger.debug(`Relative to Absolute: ${homeResolved}`);
    return path.resolve(homeResolved);
  }

  private async getFileNames(
    dirPath: PathLike,
    excludePattern: RegExp | undefined,
    includePattern: RegExp | undefined,
  ): Promise<string[]> {

    try {
      await fs.access(dirPath);
    } catch (ex) {

      logger.warn(`Could not access directory ${dirPath}`);
      return [];
    }

    return fs.readdir(dirPath, {withFileTypes: true})
      .then(async children => {

        const files: string[] = [];
        for (const child of children) {
          if (child.isFile()) {

            if (excludePattern && excludePattern.test(child.name)) {
              continue;
            }

            if (!includePattern || includePattern.test(child.name)) {
              if (typeof dirPath == 'string') {
                files.push(path.resolve(dirPath, child.name));
              } else {
                files.push(child.name);
              }
            }
          } else {
            files.push(...await this.getFileNames(child.name, excludePattern, includePattern));
          }
        }

        return files;
      });
  }
}
