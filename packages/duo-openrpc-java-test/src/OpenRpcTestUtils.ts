import fs from 'fs/promises';
import {JSONSchema7} from 'json-schema';
import {
  OmniModelTransformer,
  Dereferencer,
  OmniModelParserResult,
  SchemaFile,
  ElevateCommonPropertiesOmniModelTransformer,
  GenericsOmniModelTransformer,
  OptionsUtil, SimplifyInheritanceOmniModelTransformer,
} from '@omnigen/core';
import {JavaOptions, JAVA_OPTIONS_RESOLVER, InterfaceJavaModelTransformer} from '@omnigen/target-java';
import {JsonSchemaParser} from '@omnigen/parser-jsonschema';
import {
  DEFAULT_OPENRPC_OPTIONS,
  OpenRpcParserOptions,
  JSONRPC_OPTIONS_FALLBACK,
  OPENRPC_OPTIONS_RESOLVERS,
  OpenRpcParserBootstrapFactory, OPENRPC_OPTIONS_FALLBACK,
} from '@omnigen/parser-openrpc';
import {DEFAULT_TEST_JAVA_OPTIONS} from './JavaTestUtils.js';

export type KnownSchemaNames = 'openrpc';

export class OpenRpcTestUtils {

  static getKnownSchemaNames(): KnownSchemaNames[] {
    return ['openrpc'];
  }

  static async listExampleFileNames(type: KnownSchemaNames): Promise<string[]> {
    const dirPath = `../parser-${type}/examples/`;
    return fs.readdir(dirPath, {withFileTypes: true})
      .then(paths => {
        return paths.filter(it => it.isFile()).map(it => it.name);
      });
  }

  static async readExample(
    type: KnownSchemaNames,
    fileName: string,
    openRpcOptions: OpenRpcParserOptions = DEFAULT_OPENRPC_OPTIONS,
    javaOptions: JavaOptions = DEFAULT_TEST_JAVA_OPTIONS,
  ): Promise<OmniModelParserResult<JavaOptions>> {

    const schemaFile = new SchemaFile(
      `../parser-${type}/examples/${fileName}`,
      `../parser-${type}/examples/${fileName}`,
    );

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
      openRpcOptions,
      schemaIncomingOptions,
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

    const realJavaOptions = await OptionsUtil.updateOptions(javaOptions, schemaIncomingOptions, JAVA_OPTIONS_RESOLVER);

    for (const transformer of transformers) {
      transformer.transformModel(parseResult.model, realJavaOptions);
    }

    return {
      model: parseResult.model,
      options: realJavaOptions,
    };
  }
}
