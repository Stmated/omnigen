import {DEFAULT_OPENRPC_OPTIONS} from '@omnigen/parser-openrpc';
import {JavaOptions} from '@omnigen/target-java';
import {
  CompressTypeNaming,
  DEFAULT_MODEL_TRANSFORM_OPTIONS,
  OmniObjectType,
  OmniTypeKind,
} from '@omnigen/core';
import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils, OpenRpcTestUtils} from '@omnigen/duo-openrpc-java-test';
import {Naming, OmniModelMerge, OmniUtil} from '@omnigen/core-util';

describe('OmniModelMerge-it', () => {

  test('error-structure-1.0+1.1', async () => {

    const result10 = (await OpenRpcTestUtils.readExample(
      'openrpc', 'error-structure.json',
      DEFAULT_OPENRPC_OPTIONS,
      {
        ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
        generifyTypes: false,
      },
      {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        package: 'com.error10',
        compressUnreferencedSubTypes: true,
        compressSoloReferencedTypes: true,
      },
    ));
    const result11 = (await OpenRpcTestUtils.readExample(
      'openrpc', 'error-structure-1.1.json',
      DEFAULT_OPENRPC_OPTIONS,
      {
        ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
        generifyTypes: false,
      },
      {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        package: 'com.error11',
        compressUnreferencedSubTypes: true,
        compressSoloReferencedTypes: true,
      },
    ));

    // TODO: What options to send along here? The transform options or target options or both?
    const resultMerged = OmniModelMerge.merge<JavaOptions>([result10, result11], {
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

    const rootNodeCommon = (await JavaTestUtils.getRootNodeFromParseResult(resultMerged));
    const filesCommon = (await JavaTestUtils.getFileContentsFromRootNode(rootNodeCommon, resultMerged.options));
    const files10 = (await JavaTestUtils.getFileContentsFromParseResult(result10, [{
      node: rootNodeCommon,
      options: resultMerged.options,
    }]));
    const files11 = (await JavaTestUtils.getFileContentsFromParseResult(result11, [{
      node: rootNodeCommon,
      options: resultMerged.options,
    }]));

    const filesCommonNames = [...filesCommon.keys()].sort();
    const files10Names = [...files10.keys()].sort();
    const files11Names = [...files11.keys()].sort();

    expect(filesCommonNames).toEqual([
      // 'JsonRpcErrorResponse.java',
      'JsonRpcRequestParams.java',
      'ListThingsRequestParams.java',
      'Thing.java',
    ]);

    const expectedUniqueFileNames = [
      'ErrorUnknown.java',
      'JsonRpcError.java',
      'JsonRpcErrorResponse.java',
      'JsonRpcRequest.java',
      'JsonRpcResponse.java',
      'ListThingsError100.java',
      'ListThingsRequest.java',
      'ListThingsResponse.java',
    ];

    expect(files10Names).toEqual(expectedUniqueFileNames);
    expect(files11Names).toEqual(expectedUniqueFileNames);

    const jsonRpcRequestParamsCommon = JavaTestUtils.getParsedContent(filesCommon, 'JsonRpcRequestParams.java');
    expect(jsonRpcRequestParamsCommon.foundPackage).toEqual('com.common');
    expect(jsonRpcRequestParamsCommon.foundImports).toEqual(['javax.annotation.Generated']);

    // ListThingsRequestParams is an inner class inside JsonRpcRequestParams.
    // So here we can make sure that the import is correctly resolved.

    const jsonRpcRequest10 = JavaTestUtils.getParsedContent(files10, 'JsonRpcRequest.java');
    expect(jsonRpcRequest10.foundPackage).toEqual('com.error10');
    expect(jsonRpcRequest10.foundImports).toEqual([
      'com.common.ListThingsRequestParams',
      'javax.annotation.Generated',
    ]);

    const jsonRpcRequest11 = JavaTestUtils.getParsedContent(files11, 'JsonRpcRequest.java');
    expect(jsonRpcRequest11.foundPackage).toEqual('com.error11');
    expect(jsonRpcRequest11.foundImports).toEqual([
      'com.common.ListThingsRequestParams',
      'javax.annotation.Generated',
    ]);

    const ListThingsError10011 = JavaTestUtils.getParsedContent(files11, 'ListThingsError100.java');
    expect(ListThingsError10011.foundPackage).toEqual('com.error11');
    expect(ListThingsError10011.foundImports).toEqual([
      // 'com.common.JsonRpcErrorResponse',
      'com.fasterxml.jackson.databind.JsonNode',
      'javax.annotation.Generated',
    ]);
    expect(ListThingsError10011.foundTypes).toEqual([
      'ListThingsError100.ListThingsError100Error',
      'String',
      'JsonNode',
      'int',
    ]);
  });

  test('merge-a + merge-b', async () => {

    const result10 = (await OpenRpcTestUtils.readExample(
      'openrpc', 'merge-a.json',
      DEFAULT_OPENRPC_OPTIONS,
      {
        ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
        generifyTypes: true,
      },
      {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        package: 'com.a',
        compressUnreferencedSubTypes: true,
        compressSoloReferencedTypes: true,
      }));
    const result11 = (await OpenRpcTestUtils.readExample(
      'openrpc', 'merge-b.json',
      DEFAULT_OPENRPC_OPTIONS,
      {
        ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
        generifyTypes: true,
      },
      {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        package: 'com.b',
        compressUnreferencedSubTypes: true,
        compressSoloReferencedTypes: true,
      },
    ));

    const resultMerged = OmniModelMerge.merge<JavaOptions>([result10, result11], {
      // TODO: Add capability of figuring out package automatically, common denominator for all given options
      package: 'com.common',
      compressUnreferencedSubTypes: false,
      compressSoloReferencedTypes: false,
      compressTypeNaming: CompressTypeNaming.COMMON_PREFIX,
    });

    resultMerged.model.types.sort((a, b) => OmniUtil.describe(a).localeCompare(OmniUtil.describe(b)));

    const rootNodeCommon = (await JavaTestUtils.getRootNodeFromParseResult(resultMerged));
    const filesCommon = (await JavaTestUtils.getFileContentsFromRootNode(rootNodeCommon, resultMerged.options));
    const files10 = (await JavaTestUtils.getFileContentsFromParseResult(result10, [{
      node: rootNodeCommon,
      options: resultMerged.options,
    }]));
    const files11 = (await JavaTestUtils.getFileContentsFromParseResult(result11, [{
      node: rootNodeCommon,
      options: resultMerged.options,
    }]));

    const filesCommonNames = [...filesCommon.keys()].sort();
    const filesANames = [...files10.keys()].sort();
    const filesBNames = [...files11.keys()].sort();

    expect(filesCommonNames).toEqual([
      'ErrorUnknown.java',
      'ErrorUnknownError.java',
      'JsonRpcError.java',
      'JsonRpcErrorResponse.java',
      'JsonRpcRequestParams.java',
    ]);

    expect(filesANames).toEqual([
      'JsonRpcRequest.java',
      'JsonRpcResponse.java',
      'ListThingsError100.java',
      // 'ListThingsError100Error.java', // Included only if we do not compress types
      'ListThingsRequest.java',
      'ListThingsRequestParams.java',
      'ListThingsResponse.java',
      'SomeTypeA.java',
      'Thing.java',
    ]);

    expect(filesBNames).toEqual([
      'Element.java',
      'JsonRpcRequest.java',
      'JsonRpcResponse.java',
      'ListElementsError100.java',
      // 'ListElementsError100Error.java', // Included only if we do not compress types
      'ListElementsRequest.java',
      'ListElementsRequestParams.java',
      'ListElementsResponse.java',
      'SomeTypeB.java',
    ]);
  });

  test('merge-a-multi-endpoints', async () => {

    const result10 = (await OpenRpcTestUtils.readExample(
      'openrpc', 'merge-a-multi-endpoints.json',
      DEFAULT_OPENRPC_OPTIONS,
      {
        ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
        generifyTypes: false,
      },
      {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        package: 'com.a',
        compressUnreferencedSubTypes: true,
        compressSoloReferencedTypes: true,
        includeGeneratedAnnotation: false,
      },
    ));

    const fileMap = await JavaTestUtils.getFileContentsFromParseResult(result10);
    const filesNames = [...fileMap.keys()].sort();

    expect(filesNames).toEqual([
      'ErrorUnknown.java',
      'ErrorUnknownError.java',
      'JsonRpcError.java',
      'JsonRpcErrorResponse.java',
      'JsonRpcRequest.java',
      'JsonRpcRequestParams.java',
      'JsonRpcResponse.java',
      'ListThingsRequest.java',
      'ListThingsResponse.java',
      'SaveThingRequest.java',
      'SaveThingResponse.java',
      'SomeTypeA.java',
      'Thing.java',
    ]);

    const jsonRpcRequest = JavaTestUtils.getParsedContent(fileMap, 'JsonRpcRequest.java');
    const jsonRpcResponse = JavaTestUtils.getParsedContent(fileMap, 'JsonRpcResponse.java');
    const jsonRpcRequestParams = JavaTestUtils.getParsedContent(fileMap, 'JsonRpcRequestParams.java');
    const listThingsRequest = JavaTestUtils.getParsedContent(fileMap, 'ListThingsRequest.java');
    const listThingsResponse = JavaTestUtils.getParsedContent(fileMap, 'ListThingsResponse.java');
    const saveThingRequest = JavaTestUtils.getParsedContent(fileMap, 'SaveThingRequest.java');
    const saveThingResponse = JavaTestUtils.getParsedContent(fileMap, 'SaveThingResponse.java');

    expect(jsonRpcRequest.foundFields).toEqual(['id', 'jsonrpc']);
    expect(jsonRpcRequest.foundMethods).toEqual(['getId', 'getJsonrpc', 'getMethod']);
    expect(jsonRpcRequest.foundTypes).toEqual(['String']);
    expect(jsonRpcRequest.foundSuperClasses).toEqual([]);
    expect(jsonRpcRequest.foundSuperInterfaces).toEqual([]);

    expect(jsonRpcResponse.foundFields).toEqual(['id']);
    expect(jsonRpcResponse.foundMethods).toEqual(['getId', 'getJsonrpc']);
    expect(jsonRpcResponse.foundTypes).toEqual(['String']);
    expect(jsonRpcResponse.foundSuperClasses).toEqual([]);
    expect(jsonRpcResponse.foundSuperInterfaces).toEqual([]);
    expect(jsonRpcResponse.foundLiterals).toEqual(['"2.0"']);

    expect(jsonRpcRequestParams.foundFields).toEqual([]);
    expect(jsonRpcRequestParams.foundMethods).toEqual([]);
    expect(jsonRpcRequestParams.foundTypes).toEqual([]);
    expect(jsonRpcRequestParams.foundSuperClasses).toEqual([]);
    expect(jsonRpcRequestParams.foundSuperInterfaces).toEqual([]);

    expect(listThingsRequest.foundFields).toEqual(['params']);
    expect(listThingsRequest.foundMethods).toEqual(['getMethod', 'getParams']);
    expect(listThingsRequest.foundTypes).toEqual(['ListThingsRequest.ListThingsRequestParams', 'String']);
    expect(listThingsRequest.foundSuperClasses).toEqual(['JsonRpcRequest', 'JsonRpcRequestParams']);
    expect(listThingsRequest.foundSuperInterfaces).toEqual([]);

    expect(listThingsResponse.foundFields).toEqual(['result']);
    expect(listThingsResponse.foundMethods).toEqual(['getResult']);
    expect(listThingsResponse.foundTypes).toEqual(['Thing', 'String']);
    expect(listThingsResponse.foundSuperClasses).toEqual(['JsonRpcResponse']);
    expect(listThingsResponse.foundSuperInterfaces).toEqual([]);

    expect(saveThingRequest.foundFields).toEqual(['params', 'thing']);
    expect(saveThingRequest.foundMethods).toEqual(['getMethod', 'getParams', 'getThing']);
    expect(saveThingRequest.foundTypes).toEqual(['SaveThingRequest.SaveThingRequestParams', 'String', 'Thing']);
    expect(saveThingRequest.foundSuperClasses).toEqual(['JsonRpcRequest', 'JsonRpcRequestParams']);
    expect(saveThingRequest.foundSuperInterfaces).toEqual([]);

    expect(saveThingResponse.foundFields).toEqual(['result']);
    expect(saveThingResponse.foundMethods).toEqual(['getResult']);
    expect(saveThingResponse.foundTypes).toEqual(['long', 'String']);
    expect(saveThingResponse.foundSuperClasses).toEqual(['JsonRpcResponse']);
    expect(saveThingResponse.foundSuperInterfaces).toEqual([]);
  });

  test('w/ + w/o elevation = same endpoint response', async () => {

    const withoutElevate = (await OpenRpcTestUtils.readExample(
      'openrpc', 'merge-a-multi-endpoints.json',
      DEFAULT_OPENRPC_OPTIONS,
      {
        ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
        elevateProperties: false,
        generifyTypes: false,
      },
      {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        package: 'com.a',
        compressUnreferencedSubTypes: true,
        compressSoloReferencedTypes: true,
      },
    ));

    const withElevate = (await OpenRpcTestUtils.readExample(
      'openrpc', 'merge-a-multi-endpoints.json',
      DEFAULT_OPENRPC_OPTIONS,
      {
        ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
        elevateProperties: true,
        generifyTypes: false,
      },
      {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        package: 'com.a',
        compressUnreferencedSubTypes: true,
        compressSoloReferencedTypes: true,
      },
    ));

    // Check that the elevation did no funky business with moving in incorrect stuffs.
    const notElevated0 = withoutElevate.model.endpoints[0].responses[0].type as OmniObjectType;
    expect(notElevated0.kind).toEqual(OmniTypeKind.OBJECT);
    expect(notElevated0.properties.map(it => it.name)).toEqual([
      'jsonrpc',
      'error',
      'id',
      'result',
    ]);

    const elevated0 = withElevate.model.endpoints[0].responses[0].type as OmniObjectType;
    expect(elevated0.kind).toEqual(OmniTypeKind.OBJECT);
    expect(elevated0.properties).toHaveLength(1);
    expect(elevated0.properties[0].name).toEqual('result');
    expect(elevated0.properties[0].type.kind).toEqual(OmniTypeKind.ARRAY);
  });

  test('merge-a-multi-endpoints + merge-b-multi-endpoints', async () => {

    const resultA = (await OpenRpcTestUtils.readExample(
      'openrpc', 'merge-a-multi-endpoints.json',
      DEFAULT_OPENRPC_OPTIONS,
      {
        ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
        generifyTypes: false,
      },
      {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        package: 'com.a',
        compressUnreferencedSubTypes: true,
        compressSoloReferencedTypes: true,
      },
    ));
    const resultB = (await OpenRpcTestUtils.readExample(
      'openrpc', 'merge-b-multi-endpoints.json',
      DEFAULT_OPENRPC_OPTIONS,
      {
        ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
        generifyTypes: false,
      },
      {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        package: 'com.b',
        compressUnreferencedSubTypes: true,
        compressSoloReferencedTypes: true,
      },
    ));

    // TODO: What options to send? Target options, transform options, both?
    const resultMerged = OmniModelMerge.merge<JavaOptions>([resultA, resultB], {
      // TODO: Add capability of figuring out package automatically, common denominator for all given options
      package: 'com.common',
      compressUnreferencedSubTypes: true,
      compressSoloReferencedTypes: true,
      compressTypeNaming: CompressTypeNaming.COMMON_PREFIX,
    });

    const rootNodeCommon = (await JavaTestUtils.getRootNodeFromParseResult(resultMerged));
    const filesCommon = (await JavaTestUtils.getFileContentsFromRootNode(rootNodeCommon, resultMerged.options));
    const filesA = (await JavaTestUtils.getFileContentsFromParseResult(resultA, [{
      node: rootNodeCommon,
      options: resultMerged.options,
    }]));
    const filesB = (await JavaTestUtils.getFileContentsFromParseResult(resultB, [{
      node: rootNodeCommon,
      options: resultMerged.options,
    }]));

    const filesCommonNames = [...filesCommon.keys()].sort();
    const filesANames = [...filesA.keys()].sort();
    const filesBNames = [...filesB.keys()].sort();

    expect(filesCommonNames).toEqual([
      'ErrorUnknown.java',
      'ErrorUnknownError.java',
      'JsonRpcError.java',
      'JsonRpcErrorResponse.java',
      'JsonRpcRequest.java',
      'JsonRpcRequestParams.java',
      'JsonRpcResponse.java',
    ]);

    expect(filesANames).toEqual([
      'ListThingsRequest.java',
      'ListThingsResponse.java',
      'SaveThingRequest.java',
      'SaveThingResponse.java',
      'SomeTypeA.java',
      'Thing.java',
    ]);

    expect(filesBNames).toEqual([
      'Element.java',
      'ListElementsRequest.java',
      'ListElementsResponse.java',
      'SaveElementRequest.java',
      'SaveElementResponse.java',
      'SomeTypeB.java',
    ]);
  });

  // Create another merger test where a merge-a-multiple and merge-b-multiple have MULTIPLE endpoints
  // So that each will create a generic JsonRpcRequest<T> and JsonRpcRequestParams<T>
  // Then we have to make sure that these generic ones are moved to the common model and re-used by the others!
});
