import fs from 'fs/promises';
import {DEFAULT_FILE_WRITE_OPTIONS, DEFAULT_RUN_OPTIONS, FileWriteOptions, OmnigenOptions} from './OmnigenOptions.js';
import {OmnigenResult} from './OmnigenResult.js';
import {
  IncomingOptions,
  OmniModelTransformer,
  RenderedCompilationUnit,
  ParserOptions,
  TargetOptions,
  RealOptions,
  DEFAULT_MODEL_TRANSFORM_OPTIONS, AstNode, SchemaSource,
} from '@omnigen/core';
import {
  DEFAULT_JAVA_OPTIONS,
  InterfaceJavaModelTransformer, JAVA_FEATURES,
  JAVA_OPTIONS_RESOLVER, JavaInterpreter,
  JavaOptions, JavaRenderer,
} from '@omnigen/target-java';
import {
  DEFAULT_OPENRPC_OPTIONS,
  OpenRpcParserOptions,
  OPENRPC_OPTIONS_RESOLVERS,
  OpenRpcParserBootstrapFactory,
  OPENRPC_OPTIONS_FALLBACK,
} from '@omnigen/parser-openrpc';
import {JSONSchema7} from 'json-schema';
import {JsonSchemaParser} from '@omnigen/parser-jsonschema';
import {LoggerFactory} from '@omnigen/core-log';
import {PathLike} from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  DEFAULT_IMPLEMENTATION_OPTIONS, IMPLEMENTATION_OPTIONS_PARSERS,
  ImplementationOptions,
  JavaHttpImplementationGenerator,
} from '@omnigen/target-impl-java-http';
import {
  OptionsUtil,
  FileWriter,
  StandardOptionResolvers,
  SimplifyInheritanceModelTransformer,
  ElevatePropertiesModelTransformer,
  GenericsModelTransformer,
  TRANSFORM_OPTIONS_RESOLVER, Dereferencer, SchemaFile,
} from '@omnigen/core-util';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Main entry class which handles the default use-case for all the conversion from schema to output.
 */
export class Omnigen {

  public async generateAndWriteToFile<
    TParseOpt extends ParserOptions,
    TTargetOpt extends TargetOptions,
    TImplOpt extends ImplementationOptions,
  >(
    incomingOptions: IncomingOptions<OmnigenOptions<TParseOpt, TTargetOpt, TImplOpt>>,
    incomingFileWriteOptions: IncomingOptions<FileWriteOptions>,
  ): Promise<void> {

    const fileWriteOptions = OptionsUtil.resolve(
      DEFAULT_FILE_WRITE_OPTIONS,
      incomingFileWriteOptions,
      {
        outputDirBase: v => {
          if (!v) {
            throw new Error(`You must specify a base dir`);
          }
          return this.relativeToAbsolute(v);
        },
      });

    if (typeof fileWriteOptions.outputDirBase !== 'string') {
      throw new Error(`The output dir must be a string and not a FileLike type`);
    }

    const fileWriter = new FileWriter(fileWriteOptions.outputDirBase);

    return this.generate(incomingOptions)
      .then(result => {

        const results: OmnigenResult<TParseOpt, TTargetOpt>[] = [];
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

  public async generate<
    TParseOpt extends ParserOptions,
    TTargetOpt extends TargetOptions,
    TImplOpt extends ImplementationOptions,
  >(
    incomingOptions: IncomingOptions<OmnigenOptions<TParseOpt, TTargetOpt, TImplOpt>>,
  ): Promise<OmnigenResult<TParseOpt, TTargetOpt>[]> {

    const runOptions = OptionsUtil.resolve(
      DEFAULT_RUN_OPTIONS,
      incomingOptions,
      {
        schemaDirBase: v => {
          if (!v) {
            throw new Error(`You must specify a base dir`);
          }
          return this.relativeToAbsolute(v);
        },
        schemaPatternExclude: v => StandardOptionResolvers.toRegExp(v),
        schemaPatternInclude: v => StandardOptionResolvers.toRegExp(v),
        schemaDirRecursive: v => StandardOptionResolvers.toBoolean(v),
      });

    logger.info(`Schema base dir: ${runOptions.schemaDirBase}`);

    const excludePattern = await StandardOptionResolvers.toRegExp(runOptions.schemaPatternExclude);
    const includePattern = await StandardOptionResolvers.toRegExp(runOptions.schemaPatternInclude);
    const schemaFilePaths = await this.getFileNames(runOptions.schemaDirBase, excludePattern, includePattern);

    const promises: Promise<OmnigenResult<TParseOpt, TTargetOpt>[]>[] = [];
    for (const schemaFilePath of schemaFilePaths) {

      logger.info(`Found file ${schemaFilePath}`);

      const schemaFile = new SchemaFile(schemaFilePath, schemaFilePath);
      promises.push(
        this.generateFromSchemaFile<TParseOpt, TTargetOpt>(schemaFile, incomingOptions, incomingOptions)
          .then(async result => {

            const results: OmnigenResult<TParseOpt, TTargetOpt>[] = [];
            results.push(result);

            logger.info(`Getting companions!`);

            const companions = await this.generateAccompanyingRootNodes(result, incomingOptions);
            for (const companion of companions) {

              const rendered = this.renderRootNode(companion, result.targetOptions);

              logger.info(`Got ${rendered.length} renders from companion`);

              results.push({
                ...result,
                originRootNode: result.rootNode,
                rootNode: companion,
                renders: rendered,
              });
            }

            return results;
          }),
      );
    }

    return Promise.all(promises)
      .then(results => {

        const flat: OmnigenResult<TParseOpt, TTargetOpt>[] = [];
        for (const result of results) {
          flat.push(...result);
        }

        return flat;
      })
      .catch(error => {
        if (runOptions.failSilently) {
          console.log(`Encountered a silent error ${JSON.stringify(error)}`);
          return [] as OmnigenResult<TParseOpt, TTargetOpt>[];
        } else {
          throw error;
        }
      });
  }

  private renderRootNode<TTargetOpt extends TargetOptions>(
    rootNode: AstNode,
    targetOptions: RealOptions<TTargetOpt>,
  ): RenderedCompilationUnit[] {

    const renders: RenderedCompilationUnit[] = [];
    const javaOptions = targetOptions as unknown as RealOptions<JavaOptions>;
    const renderer = new JavaRenderer(javaOptions, rcu => {
      renders.push(rcu);
    });
    renderer.render(rootNode);

    return renders;
  }

  private async generateAccompanyingRootNodes<
    TParseOpt extends ParserOptions,
    TTargetOpt extends TargetOptions,
    TImplOpt extends ImplementationOptions
  >(
    result: OmnigenResult<TParseOpt, TTargetOpt>,
    incomingOptions: IncomingOptions<TImplOpt>,
  ): Promise<AstNode[]> {

    const generator = new JavaHttpImplementationGenerator();

    const options = OptionsUtil.resolve(
      DEFAULT_IMPLEMENTATION_OPTIONS,
      incomingOptions,
      IMPLEMENTATION_OPTIONS_PARSERS,
    );

    const generated = await generator.generate({
      model: result.model,
      root: result.rootNode,
      targetOptions: result.targetOptions as unknown as RealOptions<JavaOptions>,
      implOptions: options,
    });

    logger.info(`Generated: ${generated.length} files`);

    return generated;
  }

  private relativeToAbsolute(relative: PathLike): PathLike {

    if (typeof relative == 'string') {

      const homeDirectory = os.homedir();
      const homeResolved = homeDirectory ? relative.replace(/^~(?=$|\/|\\)/, homeDirectory) : relative;

      logger.debug(`Relative to Absolute: ${homeResolved}`);

      return path.resolve(homeResolved);
    } else {
      return relative;
    }
  }

  private async generateFromSchemaFile<TParserOpt extends ParserOptions, TTargetOpt extends TargetOptions>(
    schemaFile: SchemaSource,
    parserOptions: IncomingOptions<TParserOpt>,
    targetOptions: IncomingOptions<TTargetOpt>,
  ): Promise<OmnigenResult<TParserOpt, TTargetOpt>> {

    const transformers: OmniModelTransformer<ParserOptions>[] = [
      new SimplifyInheritanceModelTransformer(),
      new ElevatePropertiesModelTransformer(),
      new GenericsModelTransformer(),

      // TODO: Java specific! Needs to be loaded in optionally!
      new InterfaceJavaModelTransformer(),
    ];

    const openRpcParserBootstrapFactory = new OpenRpcParserBootstrapFactory();
    const openRpcParserBootstrap = (await openRpcParserBootstrapFactory.createParserBootstrap(schemaFile));
    const schemaIncomingOptions = openRpcParserBootstrap.getIncomingOptions<JavaOptions>();
    const realParserOptions = OptionsUtil.resolve(
      DEFAULT_OPENRPC_OPTIONS,
      parserOptions as IncomingOptions<OpenRpcParserOptions>,
      OPENRPC_OPTIONS_RESOLVERS,
      OPENRPC_OPTIONS_FALLBACK,
    );

    if (!realParserOptions.jsonRpcErrorDataSchema && schemaIncomingOptions?.jsonRpcErrorDataSchema) {

      // TODO: How do we solve this properly? Feels ugly making exceptions for certain options like this.
      //        Have a sort of "post converters" that can take the whole options? Need to have a look.
      const errorSchema = schemaIncomingOptions?.jsonRpcErrorDataSchema;
      if (!('kind' in errorSchema)) {

        const dereferencer = await Dereferencer.create<JSONSchema7>('', '', errorSchema);
        const jsonSchemaParser = new JsonSchemaParser<JSONSchema7, OpenRpcParserOptions>(dereferencer, realParserOptions);
        const errorType = jsonSchemaParser.transformErrorDataSchemaToOmniType('JsonRpcCustomErrorPayload', dereferencer.getFirstRoot());

        realParserOptions.jsonRpcErrorDataSchema = errorType;
      }
    }

    const openRpcParser = openRpcParserBootstrap.createParser(realParserOptions);
    const parseResult = openRpcParser.parse();

    // NOTE: Would be good if this could be handled in some more central way, so it can never be missed.
    //        But I am unsure how and where that would be.
    if (schemaIncomingOptions) {
      parseResult.model.options = schemaIncomingOptions;
    }

    let optionsAndSchemaOptions = targetOptions;
    if (schemaIncomingOptions) {
      optionsAndSchemaOptions = {...optionsAndSchemaOptions, ...schemaIncomingOptions};
    }

    const realTransformerOptions = OptionsUtil.resolve(
      DEFAULT_MODEL_TRANSFORM_OPTIONS,
      {},
      TRANSFORM_OPTIONS_RESOLVER,
    );

    for (const transformer of transformers) {
      transformer.transformModel({
        model: parseResult.model,
        options: {...realParserOptions, ...realTransformerOptions},
      });
    }

    const realJavaOptions = OptionsUtil.resolve(
      DEFAULT_JAVA_OPTIONS,
      optionsAndSchemaOptions as IncomingOptions<JavaOptions>,
      JAVA_OPTIONS_RESOLVER,
    );

    const interpreter = new JavaInterpreter(realJavaOptions, JAVA_FEATURES);
    const syntaxTree = interpreter.buildSyntaxTree(parseResult.model, []);

    const renders: RenderedCompilationUnit[] = [];
    const renderer = new JavaRenderer(realJavaOptions, rcu => {
      renders.push(rcu);
    });
    renderer.render(syntaxTree);

    return {
      model: parseResult.model,
      parseOptions: parseResult.options as unknown as RealOptions<TParserOpt>,
      targetOptions: realJavaOptions as unknown as RealOptions<TTargetOpt>,
      rootNode: syntaxTree,
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
