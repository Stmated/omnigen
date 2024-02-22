import {JavaBoot, JavaOptions} from '@omnigen/target-java';
import {ModelTransformOptions, OmniModelParserResult, OmniPrimitiveKind, OmniPrimitiveType, OmniType, OmniTypeKind, PackageOptions, TargetOptions} from '@omnigen/core';
import {Naming, OmniModelMerge, OmniUtil} from '@omnigen/core-util';
import {describe, expect, test, vi} from 'vitest';
import {PluginManager} from '@omnigen/plugin';
import {BaseContext, FileContext, FilesContext, SourceContext, TargetContext, ZodModelContext, ZodPackageOptionsContext, ZodTargetOptionsContext} from '@omnigen/core-plugin';
import {OpenRpcPlugin} from '@omnigen/parser-openrpc';

function expectKind<T extends OmniType, K extends OmniTypeKind>(value: T, kind: K): asserts value is Extract<T, { kind: K }> {
  expect(value.kind).toEqual(kind);
}

function expectPrimitiveKind<T extends OmniPrimitiveType, PK extends T['primitiveKind']>(value: T, primitiveKind: PK): asserts value is Extract<T, { primitiveKind: PK }> {
  expect(value.primitiveKind).toEqual(primitiveKind);
}

describe('merge-documents', () => {

  // TODO: PluginManager needs to be able to split the work into two completely different paths
  // TODO: PluginManager needs to be able to merge the split paths back into one

  // TODO: Need to separate the OpenRpcParser and JsonSchemaParser so they are more standalone
  // TODO: Need to be able to refer to types between documents (like in this test case)

  // TODO: Need to make sure that when all is said and done, we have one large OmniModel with all proper types and endpoints

  const pm = new PluginManager({includeAuto: true});

  test('jsonschema', async ({task}) => {

    const exec = await pm.execute({
      ctx: {
        file: `./src/parse/__examples__/petstore-simple-jsonschema.json`,
        arguments: {},
      } satisfies BaseContext & FileContext,
      debug: true,
      stopAt: ZodModelContext,
    });

    // TODO:
    //  * Primitive should have a name: PetId -- dependant on target language if it is actually output or just inlined everywhere

    const model = exec.result.ctx.model;
    expect(model.types).toHaveLength(3);

    expectKind(model.types[0], OmniTypeKind.PRIMITIVE);
    expectKind(model.types[1], OmniTypeKind.PRIMITIVE);
    expectKind(model.types[2], OmniTypeKind.OBJECT);

    expect(model.types[0].primitiveKind).toEqual(OmniPrimitiveKind.INTEGER);
    expect(Naming.unwrap(model.types[0].name ?? '')).toEqual(`PetId`);

    expect(model.types[1].primitiveKind).toEqual(OmniPrimitiveKind.INTEGER);
    expect(Naming.unwrap(model.types[1].name ?? '')).toEqual(`PetAge`);

    expect(Naming.unwrap(model.types[2].name)).toEqual(`Pet`);
    expect(model.types[2].description).toEqual('Description about the Pet');
    expect(model.types[2].properties).toHaveLength(4);

    expect(model.types[2].properties.map(it => it.name)).toEqual(['id', 'age', 'name', 'tag']);
    expect(model.types[2].properties[1].description).toEqual('Overriding age description of the Pet');
    expect(model.types[2].properties[1].type.description).toEqual('Age of the Pet');
  });

  test('cross-referenced_openrpc+jsonschema', async ({task}) => {

    // const exec = await pm.execute({
    //   ctx: {
    //     files: [
    //       `./__examples__/petstore-simple-jsonschema.json`,
    //       `./__examples__/petstore-simple-openrpc.json`,
    //     ],
    //     target: 'java',
    //     arguments: {},
    //   } satisfies BaseContext & FilesContext & TargetContext,
    //   debug: true,
    //   stopAt: ZodModelContext,
    // });
  });

  test('cross-referenced_openapi-yaml+jsonschema', async ({task}) => {

    // TODO: Need to support YAML files

    // const exec = await pm.execute({
    //   ctx: {
    //     files: [
    //       `./__examples__/petstore-simple-jsonschema.json`,
    //       `./__examples__/petstore-simple-openapi.yaml`,
    //     ],
    //     target: 'java',
    //     arguments: {},
    //   } satisfies BaseContext & FilesContext & TargetContext,
    //   debug: true,
    //   stopAt: ZodModelContext,
    // });
  });
});

const toArguments = (args: Partial<ModelTransformOptions & TargetOptions & PackageOptions>) => {
  return args;
};

describe('merge-models', () => {

  test('find-equivalent-models-error-structure-1.0+1.1', async () => {

    expect(OpenRpcPlugin, 'Here to make sure OpenRPC plugins are registered').toBeDefined();

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const pm = new PluginManager({includeAuto: true});

    const exec10 = await pm.execute({
      ctx: {
        file: `../parser-openrpc/examples/error-structure.json`,
        target: 'java',
        arguments: toArguments({
          generifyTypes: false,
          compressUnreferencedSubTypes: true,
          compressSoloReferencedTypes: true,
          package: 'com.error10',
        }),
      } satisfies BaseContext & FileContext & TargetContext,
      debug: true,
      stopAt: ZodModelContext.merge(JavaBoot.ZodJavaOptionsContext).merge(ZodPackageOptionsContext).merge(ZodTargetOptionsContext),
    });

    const exec11 = await pm.execute({
      ctx: {
        file: `../parser-openrpc/examples/error-structure-1.1.json`,
        target: 'java',
        arguments: toArguments({
          generifyTypes: false,
          compressUnreferencedSubTypes: true,
          compressSoloReferencedTypes: true,
          package: 'com.error11',
        }),
      } satisfies BaseContext & FileContext & TargetContext,
      debug: true,
      stopAt: ZodModelContext.merge(JavaBoot.ZodJavaOptionsContext).merge(ZodPackageOptionsContext).merge(ZodTargetOptionsContext),
    });

    // TODO: What options to send along here? The transform options or target options or both?

    const results: OmniModelParserResult<JavaOptions & PackageOptions & TargetOptions>[] = [
      {
        model: exec10.result.ctx.model,
        options: {...exec10.result.ctx.javaOptions, ...exec10.result.ctx.packageOptions, ...exec10.result.ctx.targetOptions},
      },
      {
        model: exec11.result.ctx.model,
        options: {...exec11.result.ctx.javaOptions, ...exec11.result.ctx.packageOptions, ...exec11.result.ctx.targetOptions},
      },
    ];

    const resultMerged = OmniModelMerge.merge<JavaOptions & PackageOptions & TargetOptions>(results, {
      // TODO: Add capability of figuring out package automatically, common denominator for all given options
      package: 'com.common',
      compressUnreferencedSubTypes: true,
      compressSoloReferencedTypes: true,
    });

    // The merged model should (for now, we will see later) be virtually empty of functionality.
    // It is up to each respective model to output itself as normally, but to be aware that types are common.
    // This can for example be done at the file writing stage, where if the other model has already written
    // the common type to disk, then we do not need to do so again if we encounter it.
    expect(resultMerged).toBeDefined();

    expect(resultMerged.model.endpoints).toHaveLength(0);

    resultMerged.model.types.sort((a, b) => OmniUtil.describe(a).localeCompare(OmniUtil.describe(b)));

    const typeNames = resultMerged.model.types.map(it => Naming.unwrap(OmniUtil.getTypeName(it) || ''));
    expect(typeNames).toEqual([
      // 'JsonRpcErrorResponse',
      'JsonRpcRequestParams',
      'ListThingsRequestParams',
      'Thing',
    ]);
  });
});

// const toArguments = (args: Partial<ModelTransformOptions & TargetOptions & PackageOptions>) => {
//   return args;
// };
//
// describe('OmniModelMerge-it', () => {
//
//   test('error-structure-1.0+1.1', async () => {
//
//     vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});
//
//     const pm = new PluginManager({includeAuto: true});
//
//     const exec10 = await pm.execute({
//       ctx: {
//         file: `../parser-openrpc/examples/error-structure.json`,
//         target: 'java',
//         arguments: toArguments({
//           generifyTypes: false,
//           compressUnreferencedSubTypes: true,
//           compressSoloReferencedTypes: true,
//           package: 'com.error10',
//         }),
//       } satisfies BaseContext & FileContext & TargetContext,
//       debug: true,
//       stopAt: ZodModelContext.merge(JavaBoot.ZodJavaOptionsContext).merge(ZodPackageOptionsContext).merge(ZodTargetOptionsContext),
//     });
//
//     const exec11 = await pm.execute({
//       ctx: {
//         file: `../parser-openrpc/examples/error-structure-1.1.json`,
//         target: 'java',
//         arguments: toArguments({
//           generifyTypes: false,
//           compressUnreferencedSubTypes: true,
//           compressSoloReferencedTypes: true,
//           package: 'com.error11',
//         }),
//       } satisfies BaseContext & FileContext & TargetContext,
//       debug: true,
//       stopAt: ZodModelContext.merge(JavaBoot.ZodJavaOptionsContext).merge(ZodPackageOptionsContext).merge(ZodTargetOptionsContext),
//     });
//
//     // TODO: What options to send along here? The transform options or target options or both?
//
//     const results: OmniModelParserResult<JavaOptions & PackageOptions & TargetOptions>[] = [
//       {
//         model: exec10.result.ctx.model,
//         options: {...exec10.result.ctx.javaOptions, ...exec10.result.ctx.packageOptions, ...exec10.result.ctx.targetOptions},
//       },
//       {
//         model: exec11.result.ctx.model,
//         options: {...exec11.result.ctx.javaOptions, ...exec11.result.ctx.packageOptions, ...exec11.result.ctx.targetOptions},
//       },
//     ];
//
//     const resultMerged = OmniModelMerge.merge<JavaOptions & PackageOptions & TargetOptions>(results, {
//       // TODO: Add capability of figuring out package automatically, common denominator for all given options
//       package: 'com.common',
//       compressUnreferencedSubTypes: true,
//       compressSoloReferencedTypes: true,
//     });
//
//     // The merged model should (for now, we will see later) be virtually empty of functionality.
//     // It is up to each respective model to output itself as normally, but to be aware that types are common.
//     // This can for example be done at the file writing stage, where if the other model has already written
//     // the common type to disk, then we do not need to do so again if we encounter it.
//     expect(resultMerged).toBeDefined();
//
//     expect(resultMerged.model.endpoints).toHaveLength(0);
//
//     resultMerged.model.types.sort((a, b) => OmniUtil.describe(a).localeCompare(OmniUtil.describe(b)));
//
//     const typeNames = resultMerged.model.types.map(it => Naming.unwrap(OmniUtil.getTypeName(it) || ''));
//     expect(typeNames).toEqual([
//       // 'JsonRpcErrorResponse',
//       'JsonRpcRequestParams',
//       'ListThingsRequestParams',
//       'Thing',
//     ]);
//
//     // TODO: Need to make this simply continue from the point of the previous execution!
//
//     if (!exec10.stoppedAt) {
//       throw new Error(`The 1.0 plugin execution should have been stopped`);
//     }
//
//     const execCommon = await pm.executeFromItemOnwards({
//       ...exec10.stoppedAt,
//       inType: exec10.stoppedAt.inType,
//       inCtx: {
//         ...exec10.stoppedAt.inCtx,
//         model: resultMerged.model,
//         packageOptions: resultMerged.options, targetOptions: resultMerged.options, javaOptions: resultMerged.options,
//       },
//       stopAt: ZodCompilationUnitsContext,
//     });
//
//     const lastCommon = execCommon.results[execCommon.results.length - 1];
//     const lastCommonCtx = lastCommon.ctx as CompilationUnitsContext;
//
//     const filesCommon = JavaTestUtils.cuToContentMap(lastCommonCtx.compilationUnits);
//     const files10 = JavaTestUtils.cuToContentMap(lastCommonCtx.compilationUnits);
//     const files11 = JavaTestUtils.cuToContentMap(lastCommonCtx.compilationUnits);
//
//     // let i = 0;
//     // const filesCommon = (await JavaTestUtils.getFileContentsFromRootNode(rootNodeCommon, resultMerged.options));
//     // const files10 = (await JavaTestUtils.getFileContentsFromParseResult(results[0], [{
//     //   node: rootNodeCommon,
//     //   options: resultMerged.options,
//     // }]));
//     // const files11 = (await JavaTestUtils.getFileContentsFromParseResult(results[1], [{
//     //   node: rootNodeCommon,
//     //   options: resultMerged.options,
//     // }]));
//
//     const filesCommonNames = [...filesCommon.keys()].sort();
//     const files10Names = [...files10.keys()].sort();
//     const files11Names = [...files11.keys()].sort();
//
//     expect(filesCommonNames).toEqual([
//       // 'JsonRpcErrorResponse.java',
//       'JsonRpcRequestParams.java',
//       'ListThingsRequestParams.java',
//       'Thing.java',
//     ]);
//
//     const expectedUniqueFileNames = [
//       'ErrorUnknown.java',
//       'JsonRpcError.java',
//       'JsonRpcErrorResponse.java',
//       'JsonRpcRequest.java',
//       'JsonRpcResponse.java',
//       'ListThingsError100.java',
//       'ListThingsRequest.java',
//       'ListThingsResponse.java',
//     ];
//
//     expect(files10Names).toEqual(expectedUniqueFileNames);
//     expect(files11Names).toEqual(expectedUniqueFileNames);
//
//     const jsonRpcRequestParamsCommon = JavaTestUtils.getParsedContent(filesCommon, 'JsonRpcRequestParams.java');
//     expect(jsonRpcRequestParamsCommon.foundPackage).toEqual('com.common');
//     expect(jsonRpcRequestParamsCommon.foundImports).toEqual(['javax.annotation.Generated']);
//
//     // ListThingsRequestParams is an inner class inside JsonRpcRequestParams.
//     // So here we can make sure that the import is correctly resolved.
//
//     const jsonRpcRequest10 = JavaTestUtils.getParsedContent(files10, 'JsonRpcRequest.java');
//     expect(jsonRpcRequest10.foundPackage).toEqual('com.error10');
//     expect(jsonRpcRequest10.foundImports).toEqual([
//       'com.common.ListThingsRequestParams',
//       'javax.annotation.Generated',
//     ]);
//
//     const jsonRpcRequest11 = JavaTestUtils.getParsedContent(files11, 'JsonRpcRequest.java');
//     expect(jsonRpcRequest11.foundPackage).toEqual('com.error11');
//     expect(jsonRpcRequest11.foundImports).toEqual([
//       'com.common.ListThingsRequestParams',
//       'javax.annotation.Generated',
//     ]);
//
//     const ListThingsError10011 = JavaTestUtils.getParsedContent(files11, 'ListThingsError100.java');
//     expect(ListThingsError10011.foundPackage).toEqual('com.error11');
//     expect(ListThingsError10011.foundImports).toEqual([
//       // 'com.common.JsonRpcErrorResponse',
//       'com.fasterxml.jackson.databind.JsonNode',
//       'javax.annotation.Generated',
//     ]);
//     expect(ListThingsError10011.foundTypes).toEqual([
//       'ListThingsError100.ListThingsError100Error',
//       'String',
//       'JsonNode',
//       'int',
//     ]);
//   })
//   ;
//
//   test('merge-a + merge-b', async () => {
//
//     const result10 = (await OpenRpcTestUtils.readExample(
//       'openrpc', 'merge-a.json',
//       {
//         modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: true},
//         packageOptions: {...DEFAULT_PACKAGE_OPTIONS, package: 'com.a'},
//         targetOptions: {
//           ...DEFAULT_TEST_TARGET_OPTIONS,
//           compressUnreferencedSubTypes: true,
//           compressSoloReferencedTypes: true,
//         },
//       }));
//     // DEFAULT_OPENRPC_OPTIONS,
//     // {
//     //   ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
//     //   generifyTypes: true,
//     // },
//     // {
//     //   ...DEFAULT_TEST_JAVA_OPTIONS,
//     //   package: 'com.a',
//     //   compressUnreferencedSubTypes: true,
//     //   compressSoloReferencedTypes: true,
//     // }));
//     const result11 = (await OpenRpcTestUtils.readExample(
//       'openrpc', 'merge-b.json',
//       {
//         modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: true},
//         packageOptions: {...DEFAULT_PACKAGE_OPTIONS, package: 'com.b'},
//         targetOptions: {
//           ...DEFAULT_TEST_TARGET_OPTIONS,
//           compressUnreferencedSubTypes: true,
//           compressSoloReferencedTypes: true,
//         },
//       },
//       // DEFAULT_OPENRPC_OPTIONS,
//       // {
//       //   ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
//       //   generifyTypes: true,
//       // },
//       // {
//       //   ...DEFAULT_TEST_JAVA_OPTIONS,
//       //   package: 'com.b',
//       //   compressUnreferencedSubTypes: true,
//       //   compressSoloReferencedTypes: true,
//       // },
//     ));
//
//     const resultMerged = OmniModelMerge.merge<JavaOptions & PackageOptions & TargetOptions>([result10, result11], {
//       // TODO: Add capability of figuring out package automatically, common denominator for all given options
//       package: 'com.common',
//       compressUnreferencedSubTypes: false,
//       compressSoloReferencedTypes: false,
//       compressTypeNaming: CompressTypeNaming.COMMON_PREFIX,
//     });
//
//     resultMerged.model.types.sort((a, b) => OmniUtil.describe(a).localeCompare(OmniUtil.describe(b)));
//
//     const rootNodeCommon = await JavaTestUtils.getRootNodeFromParseResult(resultMerged);
//     const filesCommon = (await JavaTestUtils.getFileContentsFromRootNode(rootNodeCommon, resultMerged.options));
//     const files10 = (await JavaTestUtils.getFileContentsFromParseResult(result10, [{
//       node: rootNodeCommon,
//       options: resultMerged.options,
//     }]));
//     const files11 = (await JavaTestUtils.getFileContentsFromParseResult(result11, [{
//       node: rootNodeCommon,
//       options: resultMerged.options,
//     }]));
//
//     const filesCommonNames = [...filesCommon.keys()].sort();
//     const filesANames = [...files10.keys()].sort();
//     const filesBNames = [...files11.keys()].sort();
//
//     expect(filesCommonNames).toEqual([
//       'ErrorUnknown.java',
//       'ErrorUnknownError.java',
//       'JsonRpcError.java',
//       'JsonRpcErrorResponse.java',
//       'JsonRpcRequestParams.java',
//     ]);
//
//     expect(filesANames).toEqual([
//       'JsonRpcRequest.java',
//       'JsonRpcResponse.java',
//       'ListThingsError100.java',
//       // 'ListThingsError100Error.java', // Included only if we do not compress types
//       'ListThingsRequest.java',
//       'ListThingsRequestParams.java',
//       'ListThingsResponse.java',
//       'SomeTypeA.java',
//       'Thing.java',
//     ]);
//
//     expect(filesBNames).toEqual([
//       'Element.java',
//       'JsonRpcRequest.java',
//       'JsonRpcResponse.java',
//       'ListElementsError100.java',
//       // 'ListElementsError100Error.java', // Included only if we do not compress types
//       'ListElementsRequest.java',
//       'ListElementsRequestParams.java',
//       'ListElementsResponse.java',
//       'SomeTypeB.java',
//     ]);
//   });
//
//   test('merge-a-multi-endpoints', async () => {
//
//     const result10 = (await OpenRpcTestUtils.readExample(
//       'openrpc', 'merge-a-multi-endpoints.json',
//       {
//         modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: false},
//         packageOptions: {...DEFAULT_PACKAGE_OPTIONS, package: 'com.a'},
//         targetOptions: {
//           ...DEFAULT_TEST_TARGET_OPTIONS,
//           compressUnreferencedSubTypes: true,
//           compressSoloReferencedTypes: true,
//         },
//         javaOptions: {...DEFAULT_TEST_JAVA_OPTIONS, includeGeneratedAnnotation: false},
//       },
//       // DEFAULT_OPENRPC_OPTIONS,
//       // {
//       //   ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
//       //   generifyTypes: false,
//       // },
//       // {
//       //   ...DEFAULT_TEST_JAVA_OPTIONS,
//       //   package: 'com.a',
//       //   compressUnreferencedSubTypes: true,
//       //   compressSoloReferencedTypes: true,
//       //   includeGeneratedAnnotation: false,
//       // },
//     ));
//
//     const fileMap = await JavaTestUtils.getFileContentsFromParseResult(result10);
//     const filesNames = [...fileMap.keys()].sort();
//
//     expect(filesNames).toEqual([
//       'ErrorUnknown.java',
//       'ErrorUnknownError.java',
//       'JsonRpcError.java',
//       'JsonRpcErrorResponse.java',
//       'JsonRpcRequest.java',
//       'JsonRpcRequestParams.java',
//       'JsonRpcResponse.java',
//       'ListThingsRequest.java',
//       'ListThingsResponse.java',
//       'SaveThingRequest.java',
//       'SaveThingResponse.java',
//       'SomeTypeA.java',
//       'Thing.java',
//     ]);
//
//     const jsonRpcRequest = JavaTestUtils.getParsedContent(fileMap, 'JsonRpcRequest.java');
//     const jsonRpcResponse = JavaTestUtils.getParsedContent(fileMap, 'JsonRpcResponse.java');
//     const jsonRpcRequestParams = JavaTestUtils.getParsedContent(fileMap, 'JsonRpcRequestParams.java');
//     const listThingsRequest = JavaTestUtils.getParsedContent(fileMap, 'ListThingsRequest.java');
//     const listThingsResponse = JavaTestUtils.getParsedContent(fileMap, 'ListThingsResponse.java');
//     const saveThingRequest = JavaTestUtils.getParsedContent(fileMap, 'SaveThingRequest.java');
//     const saveThingResponse = JavaTestUtils.getParsedContent(fileMap, 'SaveThingResponse.java');
//
//     expect(jsonRpcRequest.foundFields).toEqual(['id', 'jsonrpc']);
//     expect(jsonRpcRequest.foundMethods).toEqual(['getId', 'getJsonrpc', 'getMethod']);
//     expect(jsonRpcRequest.foundTypes).toEqual(['String']);
//     expect(jsonRpcRequest.foundSuperClasses).toEqual([]);
//     expect(jsonRpcRequest.foundSuperInterfaces).toEqual([]);
//
//     expect(jsonRpcResponse.foundFields).toEqual(['id']);
//     expect(jsonRpcResponse.foundMethods).toEqual(['getId', 'getJsonrpc']);
//     expect(jsonRpcResponse.foundTypes).toEqual(['String']);
//     expect(jsonRpcResponse.foundSuperClasses).toEqual([]);
//     expect(jsonRpcResponse.foundSuperInterfaces).toEqual([]);
//     expect(jsonRpcResponse.foundLiterals).toEqual(['"2.0"']);
//
//     expect(jsonRpcRequestParams.foundFields).toEqual([]);
//     expect(jsonRpcRequestParams.foundMethods).toEqual([]);
//     expect(jsonRpcRequestParams.foundTypes).toEqual([]);
//     expect(jsonRpcRequestParams.foundSuperClasses).toEqual([]);
//     expect(jsonRpcRequestParams.foundSuperInterfaces).toEqual([]);
//
//     expect(listThingsRequest.foundFields).toEqual(['params']);
//     expect(listThingsRequest.foundMethods).toEqual(['getMethod', 'getParams']);
//     expect(listThingsRequest.foundTypes).toEqual(['ListThingsRequest.ListThingsRequestParams', 'String']);
//     expect(listThingsRequest.foundSuperClasses).toEqual(['JsonRpcRequest', 'JsonRpcRequestParams']);
//     expect(listThingsRequest.foundSuperInterfaces).toEqual([]);
//
//     expect(listThingsResponse.foundFields).toEqual(['result']);
//     expect(listThingsResponse.foundMethods).toEqual(['getResult']);
//     expect(listThingsResponse.foundTypes).toEqual(['Thing', 'String']);
//     expect(listThingsResponse.foundSuperClasses).toEqual(['JsonRpcResponse']);
//     expect(listThingsResponse.foundSuperInterfaces).toEqual([]);
//
//     expect(saveThingRequest.foundFields).toEqual(['params', 'thing']);
//     expect(saveThingRequest.foundMethods).toEqual(['getMethod', 'getParams', 'getThing']);
//     expect(saveThingRequest.foundTypes).toEqual(['SaveThingRequest.SaveThingRequestParams', 'String', 'Thing']);
//     expect(saveThingRequest.foundSuperClasses).toEqual(['JsonRpcRequest', 'JsonRpcRequestParams']);
//     expect(saveThingRequest.foundSuperInterfaces).toEqual([]);
//
//     expect(saveThingResponse.foundFields).toEqual(['result']);
//     expect(saveThingResponse.foundMethods).toEqual(['getResult']);
//     expect(saveThingResponse.foundTypes).toEqual(['long', 'String']);
//     expect(saveThingResponse.foundSuperClasses).toEqual(['JsonRpcResponse']);
//     expect(saveThingResponse.foundSuperInterfaces).toEqual([]);
//   });
//
//   test('w/ + w/o elevation = same endpoint response', async () => {
//
//     const withoutElevate = (await OpenRpcTestUtils.readExample(
//       'openrpc', 'merge-a-multi-endpoints.json',
//       {
//         modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, elevateProperties: false, generifyTypes: false},
//         packageOptions: {...DEFAULT_PACKAGE_OPTIONS, package: 'com.a'},
//         targetOptions: {
//           ...DEFAULT_TEST_TARGET_OPTIONS,
//           compressUnreferencedSubTypes: true,
//           compressSoloReferencedTypes: true,
//         },
//       },
//
//       // DEFAULT_OPENRPC_OPTIONS,
//       // {
//       //   ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
//       //   elevateProperties: false,
//       //   generifyTypes: false,
//       // },
//       // {
//       //   ...DEFAULT_TEST_JAVA_OPTIONS,
//       //   package: 'com.a',
//       //   compressUnreferencedSubTypes: true,
//       //   compressSoloReferencedTypes: true,
//       // },
//     ));
//
//     const withElevate = (await OpenRpcTestUtils.readExample(
//       'openrpc', 'merge-a-multi-endpoints.json',
//       {
//         modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, elevateProperties: true, generifyTypes: false},
//         packageOptions: {...DEFAULT_PACKAGE_OPTIONS, package: 'com.a'},
//         targetOptions: {
//           ...DEFAULT_TEST_TARGET_OPTIONS,
//           compressUnreferencedSubTypes: true,
//           compressSoloReferencedTypes: true,
//         },
//       },
//
//       // DEFAULT_OPENRPC_OPTIONS,
//       // {
//       //   ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
//       //   elevateProperties: true,
//       //   generifyTypes: false,
//       // },
//       // {
//       //   ...DEFAULT_TEST_JAVA_OPTIONS,
//       //   package: 'com.a',
//       //   compressUnreferencedSubTypes: true,
//       //   compressSoloReferencedTypes: true,
//       // },
//     ));
//
//     // Check that the elevation did no funky business with moving in incorrect stuffs.
//     const notElevated0 = withoutElevate.model.endpoints[0].responses[0].type as OmniObjectType;
//     expect(notElevated0.kind).toEqual(OmniTypeKind.OBJECT);
//     expect(notElevated0.properties.map(it => it.name)).toEqual([
//       'jsonrpc',
//       'error',
//       'id',
//       'result',
//     ]);
//
//     const elevated0 = withElevate.model.endpoints[0].responses[0].type as OmniObjectType;
//     expect(elevated0.kind).toEqual(OmniTypeKind.OBJECT);
//     expect(elevated0.properties).toHaveLength(1);
//     expect(elevated0.properties[0].name).toEqual('result');
//     expect(elevated0.properties[0].type.kind).toEqual(OmniTypeKind.ARRAY);
//   });
//
//   test('merge-a-multi-endpoints + merge-b-multi-endpoints', async () => {
//
//     const resultA = (await OpenRpcTestUtils.readExample(
//       'openrpc', 'merge-a-multi-endpoints.json',
//       {
//         modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: false},
//         packageOptions: {...DEFAULT_PACKAGE_OPTIONS, package: 'com.a'},
//         targetOptions: {
//           ...DEFAULT_TEST_TARGET_OPTIONS,
//           compressUnreferencedSubTypes: true,
//           compressSoloReferencedTypes: true,
//         },
//       },
//
//       // DEFAULT_OPENRPC_OPTIONS,
//       // {
//       //   ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
//       //   generifyTypes: false,
//       // },
//       // {
//       //   ...DEFAULT_TEST_JAVA_OPTIONS,
//       //   package: 'com.a',
//       //   compressUnreferencedSubTypes: true,
//       //   compressSoloReferencedTypes: true,
//       // },
//     ));
//     const resultB = (await OpenRpcTestUtils.readExample(
//       'openrpc', 'merge-b-multi-endpoints.json',
//       {
//         modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generifyTypes: false},
//         packageOptions: {...DEFAULT_PACKAGE_OPTIONS, package: 'com.b'},
//         targetOptions: {
//           ...DEFAULT_TEST_TARGET_OPTIONS,
//           compressUnreferencedSubTypes: true,
//           compressSoloReferencedTypes: true,
//         },
//       },
//
//       // DEFAULT_OPENRPC_OPTIONS,
//       // {
//       //   ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
//       //   generifyTypes: false,
//       // },
//       // {
//       //   ...DEFAULT_TEST_JAVA_OPTIONS,
//       //   package: 'com.b',
//       //   compressUnreferencedSubTypes: true,
//       //   compressSoloReferencedTypes: true,
//       // },
//     ));
//
//     // TODO: What options to send? Target options, transform options, both?
//     const resultMerged = OmniModelMerge.merge<JavaOptions & PackageOptions & TargetOptions>([resultA, resultB], {
//       // TODO: Add capability of figuring out package automatically, common denominator for all given options
//       package: 'com.common',
//       compressUnreferencedSubTypes: true,
//       compressSoloReferencedTypes: true,
//       compressTypeNaming: CompressTypeNaming.COMMON_PREFIX,
//     });
//
//     const rootNodeCommon = await JavaTestUtils.getRootNodeFromParseResult(resultMerged);
//     const filesCommon = (await JavaTestUtils.getFileContentsFromRootNode(rootNodeCommon, resultMerged.options));
//     const filesA = (await JavaTestUtils.getFileContentsFromParseResult(resultA, [{
//       node: rootNodeCommon,
//       options: resultMerged.options,
//     }]));
//     const filesB = (await JavaTestUtils.getFileContentsFromParseResult(resultB, [{
//       node: rootNodeCommon,
//       options: resultMerged.options,
//     }]));
//
//     const filesCommonNames = [...filesCommon.keys()].sort();
//     const filesANames = [...filesA.keys()].sort();
//     const filesBNames = [...filesB.keys()].sort();
//
//     expect(filesCommonNames).toEqual([
//       'ErrorUnknown.java',
//       'ErrorUnknownError.java',
//       'JsonRpcError.java',
//       'JsonRpcErrorResponse.java',
//       'JsonRpcRequest.java',
//       'JsonRpcRequestParams.java',
//       'JsonRpcResponse.java',
//     ]);
//
//     expect(filesANames).toEqual([
//       'ListThingsRequest.java',
//       'ListThingsResponse.java',
//       'SaveThingRequest.java',
//       'SaveThingResponse.java',
//       'SomeTypeA.java',
//       'Thing.java',
//     ]);
//
//     expect(filesBNames).toEqual([
//       'Element.java',
//       'ListElementsRequest.java',
//       'ListElementsResponse.java',
//       'SaveElementRequest.java',
//       'SaveElementResponse.java',
//       'SomeTypeB.java',
//     ]);
//   });
//
//   // Create another merger test where a merge-a-multiple and merge-b-multiple have MULTIPLE endpoints
//   // So that each will create a generic JsonRpcRequest<T> and JsonRpcRequestParams<T>
//   // Then we have to make sure that these generic ones are moved to the common model and re-used by the others!
// });
