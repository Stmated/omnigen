import fs from 'fs/promises';
import {DEFAULT_RUN_OPTIONS, OmnigenOptions, RunOptions} from './OmnigenOptions.js';
import {OmnigenResult} from './OmnigenResult.js';
import {
  Dereferencer,
  ElevateCommonPropertiesOmniModelTransformer, GenericsOmniModelTransformer, IncomingOptions,
  OmniModelTransformer,
  OptionsResolvers, OptionsUtil, RealOptions,
  SchemaFile,
  SimplifyInheritanceOmniModelTransformer,
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

/**
 * Main entry class which handles the default use-case for all the conversion from schema to output.
 */
export class Omnigen {

  public async generate(incomingOptions: IncomingOptions<OmnigenOptions>): Promise<OmnigenResult | OmnigenResult[]> {

    const runOptions = await OptionsUtil.updateOptions(
      DEFAULT_RUN_OPTIONS,
      incomingOptions,
      {
        schemaDirBase: v => {
          if (!v) {
            return Promise.reject(new Error(`You must specify a base dir`));
          }
          return Promise.resolve(v);
        },
        schemaPatternExclude: v => OptionsResolvers.toRegExp(v),
        schemaPatternInclude: v => OptionsResolvers.toRegExp(v),
        schemaDirRecursive: v => OptionsResolvers.toBoolean(v),
      });

    const dirPath = runOptions.schemaDirBase;
    const excludePattern = await OptionsResolvers.toRegExp(runOptions.schemaPatternExclude);
    const includePattern = await OptionsResolvers.toRegExp(runOptions.schemaPatternInclude);
    const fileNames = await this.getFileNames(dirPath, excludePattern, includePattern);

    const promises: Promise<OmnigenResult>[] = [];
    for (const fileName of fileNames) {

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

    const fileContents = new Map<string, string>();
    const renderer = new JavaRenderer(realJavaOptions, cu => {
      fileContents.set(cu.fileName, cu.content);
    });
    renderer.render(syntaxTree);

    // For now just log it!
    console.log(JSON.stringify(fileContents));

    return {
      files: fileContents,
    };
  }

  private async getFileNames(
    dirPath: string,
    excludePattern: RegExp | undefined,
    includePattern: RegExp | undefined,
  ): Promise<string[]> {

    return fs.readdir(dirPath, {withFileTypes: true})
      .then(async paths => {

        const files: string[] = [];
        for (const path of paths) {
          if (path.isFile()) {

            if (excludePattern && excludePattern.test(path.name)) {
              continue;
            }

            if (!includePattern || includePattern.test(path.name)) {
              files.push(path.name);
            }
          } else {
            files.push(...await this.getFileNames(path.name, excludePattern, includePattern));
          }
        }

        return files;
      });
  }
}
