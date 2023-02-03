import {DEFAULT_OPENRPC_OPTIONS} from '@omnigen/parser-openrpc';
import {JavaOptions} from '@omnigen/target-java';
import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils} from '@omnigen/duo-openrpc-java-test';
import {DEFAULT_MODEL_TRANSFORM_OPTIONS, ModelTransformOptions} from '@omnigen/core';

describe('InnerTypeCompression', () => {

  test('CompressNo', async () => {

    const transformOptions: ModelTransformOptions = {
      ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
      generifyTypes: false,
      elevateProperties: false,
    };

    const targetOptions: JavaOptions = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      compressSoloReferencedTypes: false,
      compressUnreferencedSubTypes: false,
    };

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', DEFAULT_OPENRPC_OPTIONS, transformOptions, targetOptions);

    const fileNames = [...fileContents.keys()].sort();

    expect(fileNames)
      .toEqual([
        'A.java',
        'AXOrB.java',
        'Abs.java',
        'B.java',
        'C.java',
        'ErrorUnknown.java',
        'ErrorUnknownError.java',
        'GiveInGetOut2Request.java',
        'GiveInGetOut2RequestParams.java',
        'GiveInGetOut2Response.java',
        'GiveInGetOutRequest.java',
        'GiveInGetOutRequestParams.java',
        'GiveInGetOutResponse.java',
        'IB.java',
        'IC.java',
        'In.java',
        'JsonRpcError.java',
        'JsonRpcErrorResponse.java',
        'JsonRpcRequest.java',
        'JsonRpcRequestParams.java',
        'JsonRpcResponse.java',
        'Out.java',
        'Out2.java',
      ]);

    const a = JavaTestUtils.getParsedContent(fileContents, 'A.java');
    expect(a.foundSuperClasses).toEqual(['Abs']);

    const b = JavaTestUtils.getParsedContent(fileContents, 'B.java');
    expect(b.foundSuperClasses).toEqual(['Abs']);
    expect(b.foundSuperInterfaces).toEqual(['IB']);
  });

  test('CompressYes', async () => {

    const transformOptions: ModelTransformOptions = {
      ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
      generifyTypes: false,
      elevateProperties: false,
    };

    const targetOptions: JavaOptions = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      compressSoloReferencedTypes: true,
      compressUnreferencedSubTypes: true,
    };

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json',
      DEFAULT_OPENRPC_OPTIONS,
      transformOptions,
      targetOptions,
    );

    const fileNames = [...fileContents.keys()].sort();

    expect(fileNames)
      .toEqual([
        'A.java',
        'AXOrB.java',
        'Abs.java',
        // 'B.java',
        'C.java',
        'ErrorUnknown.java',
        'GiveInGetOut2Request.java',
        'GiveInGetOut2Response.java', // TODO: WRONG! Should be created from give_string_get_string_result. Is closest "name"
        'GiveInGetOutRequest.java',
        'GiveInGetOutResponse.java',
        'IB.java',
        'IC.java',
        'In.java',
        'JsonRpcError.java',
        'JsonRpcErrorResponse.java',
        'JsonRpcRequest.java',
        'JsonRpcRequestParams.java',
        'JsonRpcResponse.java',
      ]);

    const abs = JavaTestUtils.getParsedContent(fileContents, 'Abs.java');
    expect(abs.foundSuperClasses).toEqual([]);
    expect(abs.foundSuperInterfaces).toEqual([]);
    expect(abs.foundFields).toEqual(['kind']);

    const a = JavaTestUtils.getParsedContent(fileContents, 'A.java');
    expect(a.foundSuperClasses).toEqual(['Abs']);
    expect(a.foundSuperInterfaces).toEqual([]);
    expect(a.foundFields).toEqual(['foo']);

    // const b = JavaTestUtils.getParsedContent(fileContents, 'B.java');
    // expect(b.foundSuperClasses).toEqual(['Abs']);
    // expect(b.foundSuperInterfaces).toEqual(['IB']);
    // expect(b.foundFields).toEqual(['bar']);

    const xor = JavaTestUtils.getParsedContent(fileContents, 'AXOrB.java');
    expect(xor.classDeclarationNames).toEqual(['AXOrB', 'B']);
    expect(xor.foundSuperClasses).toEqual(['Abs']);
    expect(xor.foundSuperInterfaces).toEqual(['IB']);
    expect(xor.foundFields).toEqual(['bar', '_raw', '_a', '_b']);

    // TODO: This is actually INCORRECT! It is not properly serializable with the @JsonValue annotation!
    //        Need to create some other way of handling this, like splitting into many different classes with unique parents
    const inClass = JavaTestUtils.getParsedContent(fileContents, 'In.java');
    expect(inClass.foundSuperClasses).toEqual(['AXOrB']);
    expect(inClass.foundSuperInterfaces).toEqual([]);
    expect(inClass.foundFields).toEqual(['inType']); // NOTE: Check that @JsonProperty() gets added?
  });

  test('CompressYes-error-structure', async () => {

    const transformOptions: ModelTransformOptions = {
      ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
      generifyTypes: false,
      elevateProperties: false,
    };

    const targetOptions: JavaOptions = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      compressSoloReferencedTypes: true,
      compressUnreferencedSubTypes: true,
    };

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure.json',
      DEFAULT_OPENRPC_OPTIONS,
      transformOptions,
      targetOptions,
    );
    const fileNames = [...fileContents.keys()].sort();

    // NOTE: This *could* be more aggressive, but it starts to become confusing merging some of them.
    //        Could be a future option to, for example, put ListThingsRequest inside JsonRpcRequest (which it inherits from).
    expect(fileNames)
      .toEqual([
        'ErrorUnknown.java',
        'JsonRpcError.java',
        'JsonRpcErrorResponse.java',
        'JsonRpcRequest.java',
        'JsonRpcRequestParams.java',
        'JsonRpcResponse.java',
        'ListThingsError100.java',
        'ListThingsRequest.java',
        'ListThingsResponse.java',
      ]);
  });

  test('CompressYes-error-structure w/ generics', async () => {

    const transformOptions: ModelTransformOptions = {
      ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
      generifyTypes: true,
      elevateProperties: false,
    };

    const targetOptions: JavaOptions = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      compressSoloReferencedTypes: true,
      compressUnreferencedSubTypes: true,
    };

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure.json',
      DEFAULT_OPENRPC_OPTIONS,
      transformOptions,
      targetOptions,
    );
    const fileNames = [...fileContents.keys()].sort();

    expect(fileNames)
      .toEqual([
        'ErrorUnknown.java',
        'JsonRpcError.java',
        'JsonRpcErrorResponse.java',
        'JsonRpcRequest.java',
        'JsonRpcRequestParams.java',
        'JsonRpcResponse.java',
        'ListThingsError100.java',
        // ListThingsError100Error gets its own file if using generics, since used in both:
        // * ListThingsError100
        // * JsonRpcErrorResponse (as lower-bound generic identifier target)
        // 'ListThingsError100Error.java',
        'ListThingsRequest.java',
        'ListThingsResponse.java',
      ]);
  });
});
