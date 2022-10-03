import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils} from './JavaTestUtils';
import {IJavaOptions} from '../../../src/modules/java';

describe('PackageResolver', () => {

  test('FromSchema', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('packages.json');
    const fileNames = [...fileContents.keys()].sort();
    expect(fileNames).toEqual([
      'A.java',
      'Abs.java',
      'B.java',
      'ErrorUnknown.java',
      'ErrorUnknownError.java',
      'GiveIn1GetOut1Request.java',
      'GiveIn1GetOut1RequestParams.java',
      'GiveIn1GetOut1Response.java',
      'GiveIn2GetOut2Request.java',
      'GiveIn2GetOut2RequestParams.java',
      'GiveIn2GetOut2Response.java',
      'In1.java',
      'In2.java',
      'JsonRpcError.java',
      'JsonRpcErrorResponse.java',
      'JsonRpcRequest.java',
      'JsonRpcRequestParams.java',
      'JsonRpcResponse.java',
    ]);

    const A = JavaTestUtils.getParsedContent(fileContents, 'A.java');
    expect(A.foundPackage).toEqual('com.company.out.directory1');

    const Abs = JavaTestUtils.getParsedContent(fileContents, 'Abs.java');
    expect(Abs.foundPackage).toEqual('com.company.out');

    const B = JavaTestUtils.getParsedContent(fileContents, 'B.java');
    expect(B.foundPackage).toEqual('com.company.out.directory2');

    const ErrorUnknown = JavaTestUtils.getParsedContent(fileContents, 'ErrorUnknown.java');
    expect(ErrorUnknown.foundPackage).toEqual('com.company');

    const ErrorUnknownError = JavaTestUtils.getParsedContent(fileContents, 'ErrorUnknownError.java');
    expect(ErrorUnknownError.foundPackage).toEqual('com.company');

    const GiveIn1GetOut1Request = JavaTestUtils.getParsedContent(fileContents, 'GiveIn1GetOut1Request.java');
    expect(GiveIn1GetOut1Request.foundPackage).toEqual('com.company');

    const GiveIn1GetOut1RequestParams = JavaTestUtils.getParsedContent(fileContents, 'GiveIn1GetOut1RequestParams.java');
    expect(GiveIn1GetOut1RequestParams.foundPackage).toEqual('com.company');

    const GiveIn1GetOut1Response = JavaTestUtils.getParsedContent(fileContents, 'GiveIn1GetOut1Response.java');
    expect(GiveIn1GetOut1Response.foundPackage).toEqual('com.company');

    const GiveIn2GetOut2Request = JavaTestUtils.getParsedContent(fileContents, 'GiveIn2GetOut2Request.java');
    expect(GiveIn2GetOut2Request.foundPackage).toEqual('com.company');

    const GiveIn2GetOut2RequestParams = JavaTestUtils.getParsedContent(fileContents, 'GiveIn2GetOut2RequestParams.java');
    expect(GiveIn2GetOut2RequestParams.foundPackage).toEqual('com.company');

    const GiveIn2GetOut2Response = JavaTestUtils.getParsedContent(fileContents, 'GiveIn2GetOut2Response.java');
    expect(GiveIn2GetOut2Response.foundPackage).toEqual('com.company');

    const In1 = JavaTestUtils.getParsedContent(fileContents, 'In1.java');
    expect(In1.foundPackage).toEqual('com.company.in');

    const In2 = JavaTestUtils.getParsedContent(fileContents, 'In2.java');
    expect(In2.foundPackage).toEqual('com.company.in');

    const JsonRpcError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcError.java');
    expect(JsonRpcError.foundPackage).toEqual('com.company');

    const JsonRpcErrorResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcErrorResponse.java');
    expect(JsonRpcErrorResponse.foundPackage).toEqual('com.company');

    const JsonRpcRequest = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcRequest.java');
    expect(JsonRpcRequest.foundPackage).toEqual('com.company');

    const JsonRpcRequestParams = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcRequestParams.java');
    expect(JsonRpcRequestParams.foundPackage).toEqual('com.company');

    const JsonRpcResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcResponse.java');
    expect(JsonRpcResponse.foundPackage).toEqual('com.company');
  });

  // TODO: There should be a way to give overriding options programmatically, more important than from schema
  //       Then add a test that checks that the one given from code actually takes precedence

  test('FromCode', async () => {

    const options: IJavaOptions = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      ...{
        packageResolver: (type, typeName, options) => {
          if (typeName.match(/.*Error.*/i)) {
            return "some.base.pkg.errors";
          }
          if (typeName.match(/JsonRpc.*/i)) {
            return "some.base.pkg";
          }
          return "some.other.pkg";
        }
      }
    };

    const fileContents = await JavaTestUtils.getFileContentsFromFile('additional-properties.json', 'openrpc', options);
    const fileNames = [...fileContents.keys()].sort();
    expect(fileNames).toEqual([
      'ErrorUnknown.java',
      'ErrorUnknownError.java',
      'IAdditionalProperties.java',
      'JsonRpcError.java',
      'JsonRpcErrorResponse.java',
      'JsonRpcRequest.java',
      'JsonRpcRequestParams.java',
      'JsonRpcResponse.java',
      'ListThingsRequest.java',
      'ListThingsRequestParams.java',
      'ListThingsResponse.java',
      'Thing.java'
    ]);

    // TODO: Make one of the generic targets be in another package, and make sure the package import still works!
    // TODO: Also make it so that there are two types with the same name, but which are placed in different packages!

    const ErrorUnknown = JavaTestUtils.getParsedContent(fileContents, 'ErrorUnknown.java');
    expect(ErrorUnknown.foundImports).toEqual(['javax.annotation.Generated']);
    expect(ErrorUnknown.foundPackage).toEqual('some.base.pkg.errors');
    expect(ErrorUnknown.foundTypes).toEqual(['String', 'ErrorUnknownError']);

    const ErrorUnknownError = JavaTestUtils.getParsedContent(fileContents, 'ErrorUnknownError.java');
    expect(ErrorUnknownError.foundImports).toEqual(['com.fasterxml.jackson.databind.JsonNode', 'javax.annotation.Generated']);
    expect(ErrorUnknownError.foundPackage).toEqual('some.base.pkg.errors');
    expect(ErrorUnknownError.foundTypes).toEqual(['Integer', 'String', 'JsonNode']);

    const IAdditionalProperties = JavaTestUtils.getParsedContent(fileContents, 'IAdditionalProperties.java');
    expect(IAdditionalProperties.foundImports).toEqual(['com.fasterxml.jackson.databind.JsonNode', 'java.util.Map']);
    expect(IAdditionalProperties.foundPackage).toEqual('some.other.pkg');
    expect(IAdditionalProperties.foundTypes).toEqual(['Map', 'String', 'JsonNode']);

    const JsonRpcError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcError.java');
    expect(JsonRpcError.foundImports).toEqual(['com.fasterxml.jackson.databind.JsonNode', 'javax.annotation.Generated']);
    expect(JsonRpcError.foundPackage).toEqual('some.base.pkg.errors');
    expect(JsonRpcError.foundTypes).toEqual(['Integer', 'int', 'String', 'JsonNode']);

    const JsonRpcErrorResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcErrorResponse.java');
    expect(JsonRpcErrorResponse.foundImports).toEqual(['javax.annotation.Generated']);
    expect(JsonRpcErrorResponse.foundPackage).toEqual('some.base.pkg.errors');
    expect(JsonRpcErrorResponse.foundTypes).toEqual(['String','ErrorUnknownError']);

    const JsonRpcRequest = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcRequest.java');
    expect(JsonRpcRequest.foundImports).toEqual(['javax.annotation.Generated', 'some.other.pkg.ListThingsRequestParams']);
    expect(JsonRpcRequest.foundPackage).toEqual('some.base.pkg');
    expect(JsonRpcRequest.foundTypes).toEqual(['String', 'ListThingsRequestParams']);

    const JsonRpcRequestParams = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcRequestParams.java');
    expect(JsonRpcRequestParams.foundImports).toEqual(['javax.annotation.Generated']);
    expect(JsonRpcRequestParams.foundPackage).toEqual('some.base.pkg');
    expect(JsonRpcRequestParams.foundTypes).toEqual([]);

    const JsonRpcResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcResponse.java');
    expect(JsonRpcResponse.foundImports).toEqual(['javax.annotation.Generated', 'some.other.pkg.Thing']);
    expect(JsonRpcResponse.foundPackage).toEqual('some.base.pkg');
    expect(JsonRpcResponse.foundTypes).toEqual(['String', 'Thing']);

    const ListThingsRequest = JavaTestUtils.getParsedContent(fileContents, 'ListThingsRequest.java');
    expect(ListThingsRequest.foundImports).toEqual(['javax.annotation.Generated', 'some.base.pkg.JsonRpcRequest']);
    expect(ListThingsRequest.foundPackage).toEqual('some.other.pkg');
    expect(ListThingsRequest.foundTypes).toEqual(['String', 'ListThingsRequestParams']);

    const ListThingsRequestParams = JavaTestUtils.getParsedContent(fileContents, 'ListThingsRequestParams.java');
    expect(ListThingsRequestParams.foundImports).toEqual(['javax.annotation.Generated', 'some.base.pkg.JsonRpcRequestParams']);
    expect(ListThingsRequestParams.foundPackage).toEqual('some.other.pkg');
    expect(ListThingsRequestParams.foundTypes).toEqual([]);

    const ListThingsResponse = JavaTestUtils.getParsedContent(fileContents, 'ListThingsResponse.java');
    expect(ListThingsResponse.foundImports).toEqual(['javax.annotation.Generated', 'some.base.pkg.JsonRpcResponse']);
    expect(ListThingsResponse.foundPackage).toEqual('some.other.pkg');
    expect(ListThingsResponse.foundTypes).toEqual(['String', 'Thing']);

    const Thing = JavaTestUtils.getParsedContent(fileContents, 'Thing.java');
    expect(Thing.foundImports).toEqual([
      "com.fasterxml.jackson.annotation.JsonAnyGetter",
      "com.fasterxml.jackson.annotation.JsonAnySetter",
      "com.fasterxml.jackson.databind.JsonNode",
      "java.util.Map",
      "javax.annotation.Generated"
    ]);
    expect(Thing.foundPackage).toEqual('some.other.pkg');
    expect(Thing.foundTypes).toEqual(['String', 'Map', 'JsonNode']);
  });
});


