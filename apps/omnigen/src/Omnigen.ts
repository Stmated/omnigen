import fs from 'fs/promises';
import {DEFAULT_FILE_WRITE_OPTIONS, DEFAULT_RUN_OPTIONS, FileWriteOptions, OmnigenOptions} from './OmnigenOptions.js';
import {OmnigenResult} from './OmnigenResult.js';
import {
  Dereferencer,
  ElevateCommonPropertiesOmniModelTransformer, FileWriter, GenericsOmniModelTransformer, IncomingOptions,
  OmniModelTransformer,
  StandardOptionResolvers, OptionsUtil, RenderedCompilationUnit,
  SchemaFile,
  SimplifyInheritanceOmniModelTransformer, Writer,
} from '@omnigen/core';
import {
  DEFAULT_JAVA_OPTIONS,
  InterfaceJavaModelTransformer,
  JAVA_OPTIONS_RESOLVER, JavaInterpreter,
  JavaOptions, JavaRenderer,
} from '@omnigen/target-java';
import {
  DEFAULT_OPENRPC_OPTIONS,
  OpenRpcParserOptions,
  OPENRPC_OPTIONS_RESOLVERS,
  OpenRpcParserBootstrapFactory, OPENRPC_OPTIONS_FALLBACK,
} from '@omnigen/parser-openrpc';
import {JSONSchema7} from 'json-schema';
import {JsonSchemaParser} from '@omnigen/parser-jsonschema';
import {LoggerFactory} from '@omnigen/core-log';
import {PathLike} from 'fs';
import * as path from 'path';
import * as os from 'os';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Main entry class which handles the default use-case for all the conversion from schema to output.
 */
export class Omnigen {

  public async generateAndWriteToFile(
    incomingOptions: IncomingOptions<OmnigenOptions>,
    incomingFileWriteOptions: IncomingOptions<FileWriteOptions>,
  ): Promise<void> {

    const fileWriteOptions = await OptionsUtil.updateOptions(
      DEFAULT_FILE_WRITE_OPTIONS,
      incomingFileWriteOptions,
      {
        outputDirBase: v => {
          if (!v) {
            return Promise.reject(new Error(`You must specify a base dir`));
          }
          return Promise.resolve(this.relativeToAbsolute(v));
        },
      });

    if (typeof fileWriteOptions.outputDirBase !== 'string') {
      throw new Error(`The output dir must be a string and not a FileLike type`);
    }

    const fileWriter = new FileWriter(fileWriteOptions.outputDirBase);

    return this.generate(incomingOptions)
      .then(result => {

        const results: OmnigenResult[] = [];
        if (!Array.isArray(result)) {
          results.push(result);
        } else {
          results.push(...result);
        }

        const promises = results.map(result => result.renders.flatMap(rcu => fileWriter.write(rcu)));

        return Promise.all(promises)
          .then(() => {

            // TODO: After all files are written, we should optionally introduce some kind of lock file
            //        Then we can know if files have been modified, or which to delete before generating new ones
            return;
          });
      });
  }

  public async generate(incomingOptions: IncomingOptions<OmnigenOptions>): Promise<OmnigenResult | OmnigenResult[]> {

    const runOptions = await OptionsUtil.updateOptions(
      DEFAULT_RUN_OPTIONS,
      incomingOptions,
      {
        schemaDirBase: v => {
          if (!v) {
            return Promise.reject(new Error(`You must specify a base dir`));
          }
          return Promise.resolve(this.relativeToAbsolute(v));
        },
        schemaPatternExclude: v => StandardOptionResolvers.toRegExp(v),
        schemaPatternInclude: v => StandardOptionResolvers.toRegExp(v),
        schemaDirRecursive: v => StandardOptionResolvers.toBoolean(v),
      });

    logger.info(`Schema base dir: ${runOptions.schemaDirBase}`);

    const excludePattern = await StandardOptionResolvers.toRegExp(runOptions.schemaPatternExclude);
    const includePattern = await StandardOptionResolvers.toRegExp(runOptions.schemaPatternInclude);
    const fileNames = await this.getFileNames(runOptions.schemaDirBase, excludePattern, includePattern);

    const promises: Promise<OmnigenResult>[] = [];
    for (const fileName of fileNames) {

      logger.info(`Found file ${fileName}`);

      const schemaFile = new SchemaFile(fileName, fileName);
      promises.push(this.generateFromSchemaFile(schemaFile, incomingOptions, incomingOptions));
    }

    return Promise.all<OmnigenResult>(promises)
      .then(result => {

        // TODO: Merge them? Or what do we want to do?
        if (result.length == 1) {
          return result[0];
        } else if (result.length > 1) {
          return result;
        } else {
          if (runOptions.failSilently) {
            return [] as OmnigenResult[];
          } else {
            throw new Error(`There were no schemas found`);
          }
        }
      })
      .catch(error => {
        if (runOptions.failSilently) {
          console.log(`Encountered a silent error ${JSON.stringify(error)}`);
          return [] as OmnigenResult[];
        } else {
          throw error;
        }
      });
  }

  private relativeToAbsolute(relative: PathLike): PathLike {

    if (typeof relative == 'string') {

      const homeDirectory = os.homedir();
      const homeResolved = homeDirectory ? relative.replace(/^~(?=$|\/|\\)/, homeDirectory) : relative;

      logger.info(`HomeResolved: ${homeResolved}`);

      return path.resolve(homeResolved);
    } else {
      return relative;
    }
  }

  private async generateFromSchemaFile(
    schemaFile: SchemaFile,
    openRpcOptions: IncomingOptions<OpenRpcParserOptions>,
    javaIncomingOptions: IncomingOptions<JavaOptions>,
  ): Promise<OmnigenResult> {

    const transformers: OmniModelTransformer<JavaOptions>[] = [
      new SimplifyInheritanceOmniModelTransformer(),
      new ElevateCommonPropertiesOmniModelTransformer(),
      new GenericsOmniModelTransformer(),
      new InterfaceJavaModelTransformer(),
    ];

    const openRpcParserBootstrapFactory = new OpenRpcParserBootstrapFactory();
    const openRpcParserBootstrap = (await openRpcParserBootstrapFactory.createParserBootstrap(schemaFile));
    const schemaIncomingOptions = openRpcParserBootstrap.getIncomingOptions<JavaOptions>();
    const openRpcRealOptions = await OptionsUtil.updateOptions(
      DEFAULT_OPENRPC_OPTIONS,
      openRpcOptions,
      OPENRPC_OPTIONS_RESOLVERS,
      OPENRPC_OPTIONS_FALLBACK,
    );

    if (!openRpcRealOptions.jsonRpcErrorDataSchema && schemaIncomingOptions?.jsonRpcErrorDataSchema) {

      // TODO: How do we solve this properly? Feels ugly making exceptions for certain options like this.
      //        Have a sort of "post converters" that can take the whole options? Need to have a look.
      const errorSchema = schemaIncomingOptions?.jsonRpcErrorDataSchema;
      if (!('kind' in errorSchema)) {

        const dereferencer = await Dereferencer.create<JSONSchema7>('', '', errorSchema);
        const jsonSchemaParser = new JsonSchemaParser<JSONSchema7, OpenRpcParserOptions>(dereferencer, openRpcRealOptions);
        const errorType = jsonSchemaParser.transformErrorDataSchemaToOmniType(dereferencer.getFirstRoot());

        openRpcRealOptions.jsonRpcErrorDataSchema = errorType;
      }
    }

    const openRpcParser = openRpcParserBootstrap.createParser(openRpcRealOptions);
    const parseResult = openRpcParser.parse();

    // NOTE: Would be good if this could be handled in some more central way, so it can never be missed.
    //        But I am unsure how and where that would be.
    if (schemaIncomingOptions) {
      parseResult.model.options = schemaIncomingOptions;
    }

    let optionsAndSchemaOptions = javaIncomingOptions;
    if (schemaIncomingOptions) {
      optionsAndSchemaOptions = {...optionsAndSchemaOptions, ...schemaIncomingOptions};
    }

    const realJavaOptions = await OptionsUtil.updateOptions(
      DEFAULT_JAVA_OPTIONS,
      optionsAndSchemaOptions,
      JAVA_OPTIONS_RESOLVER,
    );

    for (const transformer of transformers) {
      transformer.transformModel(parseResult.model, realJavaOptions);
    }

    const interpreter = new JavaInterpreter(realJavaOptions);
    const syntaxTree = await interpreter.buildSyntaxTree(parseResult.model, [], realJavaOptions);

    const renders: RenderedCompilationUnit[] = [];
    const renderer = new JavaRenderer(realJavaOptions, cu => {
      renders.push(cu);
    });
    renderer.render(syntaxTree);

    // For now just log it!
    // console.log(util.inspect(renders));

    return {
      renders: renders,
    };
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
