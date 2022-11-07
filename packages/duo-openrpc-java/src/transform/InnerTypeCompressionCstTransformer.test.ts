import {DEFAULT_OPENRPC_OPTIONS} from '@omnigen/parser-openrpc';
import {JavaOptions} from '@omnigen/target-java';
import {PrimitiveGenerificationChoice, RealOptions} from '@omnigen/core';
import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils} from '@omnigen/duo-openrpc-java-test';

describe('InnerTypeCompression', () => {

  test('CompressNo', async () => {

    const options: RealOptions<JavaOptions> = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      onPrimitiveGenerification: PrimitiveGenerificationChoice.SPECIALIZE,
      compressSoloReferencedTypes: false,
      compressUnreferencedSubTypes: false,
      generifyTypes: false,
      elevateProperties: false,
    };

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', options, DEFAULT_OPENRPC_OPTIONS);
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

    const options: RealOptions<JavaOptions> = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      onPrimitiveGenerification: PrimitiveGenerificationChoice.SPECIALIZE,
      compressSoloReferencedTypes: true,
      compressUnreferencedSubTypes: true,
      generifyTypes: false,
      elevateProperties: false,
    };

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', options, DEFAULT_OPENRPC_OPTIONS);
    const fileNames = [...fileContents.keys()].sort();

    expect(fileNames)
      .toEqual([
        'A.java',
        'AXOrB.java',
        'Abs.java',
        'B.java',
        'C.java',
        'ErrorUnknown.java',
        'GiveInGetOut2Request.java',
        'GiveInGetOut2Response.java',
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

    const b = JavaTestUtils.getParsedContent(fileContents, 'B.java');
    expect(b.foundSuperClasses).toEqual(['Abs']);
    expect(b.foundSuperInterfaces).toEqual(['IB']);
    expect(b.foundFields).toEqual(['bar']);

    const xor = JavaTestUtils.getParsedContent(fileContents, 'AXOrB.java');
    expect(xor.foundSuperClasses).toEqual([]);
    expect(xor.foundSuperInterfaces).toEqual([]);
    expect(xor.foundFields).toEqual(['_raw', '_a', '_b']);

    // TODO: This is actually INCORRECT! It is not properly serializable with the @JsonValue annotation!
    //        Need to create some other way of handling this, like splitting into many different classes with unique parents
    const inClass = JavaTestUtils.getParsedContent(fileContents, 'In.java');
    expect(inClass.foundSuperClasses).toEqual(['AXOrB']);
    expect(inClass.foundSuperInterfaces).toEqual([]);
    expect(inClass.foundFields).toEqual(['inType']); // NOTE: Check that @JsonProperty() gets added?
  });
});
