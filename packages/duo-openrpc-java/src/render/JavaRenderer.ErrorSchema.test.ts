import {IJavaOptions} from '@omnigen/target-java';
import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils} from '@omnigen/duo-openrpc-java-test';

describe('Error-Schema', () => {

  const JAVA_OPT: IJavaOptions = {
    ...DEFAULT_TEST_JAVA_OPTIONS,
    compressPropertiesToAncestor: false,
  };

  test('ErrorStructure', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure.json', JAVA_OPT);
    const filenames = [...fileContents.keys()].sort();

    // TODO: Figure out where ObjectThing.java is coming from
    expect(filenames).toEqual([
      'ErrorUnknown.java',
      'ErrorUnknownError.java',
      'JsonRpcError.java',
      'JsonRpcErrorResponse.java',
      'JsonRpcRequest.java',
      'JsonRpcRequestParams.java',
      'JsonRpcResponse.java',
      'ListThingsError100.java',
      'ListThingsError100Error.java',
      'ListThingsRequest.java',
      'ListThingsRequestParams.java',
      'ListThingsResponse.java',
      'Thing.java',
    ]);

    const errorResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcErrorResponse.java');
    expect(errorResponse.foundFields).toEqual(['jsonrpc', 'error']);

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toEqual(['code', 'message', 'data']);
  });

  test('ErrorStructure-1.1', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure-1.1.json', JAVA_OPT);
    const errorResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcErrorResponse.java');

    expect(errorResponse.foundFields).toContain('version');

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toHaveLength(4);
  });

  test('ErrorStructure-Custom', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure-custom.json', JAVA_OPT);
    const filenames = [...fileContents.keys()];

    expect(filenames).toContain('ListThingsError100Error.java');
    expect(filenames).toContain('JsonRpcCustomErrorPayload.java');
    expect(filenames).not.toContain('Data.java'); // Class for property 'Data' should be better named
    expect(filenames).toContain('JsonRpcCustomErrorPayload.java');

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toEqual(['code', 'message', 'error', 'name']);
    expect(error100.foundLiterals[7]).toEqual('"JSONRPCError"');

    const customError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcCustomErrorPayload.java');
    expect(customError.foundFields).toEqual(['signature', 'uuid', 'method', 'data', '_additionalProperties']);
  });
});
