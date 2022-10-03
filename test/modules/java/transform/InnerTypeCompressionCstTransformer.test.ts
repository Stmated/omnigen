import {DEFAULT_OPENRPC_OPTIONS} from '@parse/openrpc';
import {IJavaOptions} from '@java';
import {RealOptions, PrimitiveGenerificationChoice} from '@options';
import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils} from '../JavaTestUtils';

describe('Reuse Common Types', () => {

  test('CompressNo', async () => {

    const options: RealOptions<IJavaOptions> = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      ...{
        onPrimitiveGenerification: PrimitiveGenerificationChoice.SPECIALIZE,
        compressSoloReferencedTypes: false,
        compressUnreferencedSubTypes: false,
      }
    };

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', 'openrpc', options, DEFAULT_OPENRPC_OPTIONS);
    const fileNames = [...fileContents.keys()].sort();

    expect(fileNames.sort())
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
        'Out_2.java',
      ]);
  });

  test('CompressYes', async () => {

    const options: RealOptions<IJavaOptions> = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      ...{
        onPrimitiveGenerification: PrimitiveGenerificationChoice.SPECIALIZE,
        compressSoloReferencedTypes: true,
        compressUnreferencedSubTypes: true,
      }
    }

    const fileContents = await JavaTestUtils.getFileContentsFromFile('multiple-inheritance.json', 'openrpc', options, DEFAULT_OPENRPC_OPTIONS);
    const fileNames = [...fileContents.keys()].sort();

    expect(fileNames.sort())
      .toEqual([
        'A.java',
        'AXOrB.java',
        'Abs.java',
        'C.java',
        'GiveInGetOut2Request.java',
        'GiveInGetOut2Response.java',
        'GiveInGetOutRequest.java',
        'GiveInGetOutResponse.java',
        'IB.java',
        'IC.java',
        'JsonRpcError.java',
        'JsonRpcErrorResponse.java',
        'JsonRpcRequest.java',
        'JsonRpcRequestParams.java',
        'JsonRpcResponse.java',
      ]);
  });
});
