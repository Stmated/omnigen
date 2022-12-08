import {JavaOptions} from '@omnigen/target-java';
import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils} from '@omnigen/duo-openrpc-java-test';
import {DEFAULT_MODEL_TRANSFORM_OPTIONS, ModelTransformOptions} from '@omnigen/core';
import {DEFAULT_OPENRPC_OPTIONS} from '@omnigen/parser-openrpc';

describe('Error-Schema', () => {

  const transformOptions: ModelTransformOptions = {
    ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
    elevateProperties: false,
  };

  const targetOptions: JavaOptions = {
    ...DEFAULT_TEST_JAVA_OPTIONS,
  };

  test('ErrorStructure', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure.json',
      DEFAULT_OPENRPC_OPTIONS,
      transformOptions,
      targetOptions,
    );
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

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure-1.1.json',
      DEFAULT_OPENRPC_OPTIONS,
      DEFAULT_MODEL_TRANSFORM_OPTIONS,
      targetOptions,
    );
    const errorResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcErrorResponse.java');

    expect(errorResponse.foundFields).toContain('version');

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toHaveLength(4);
  });

  test('ErrorStructure-Custom', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure-custom.json',
      DEFAULT_OPENRPC_OPTIONS,
      DEFAULT_MODEL_TRANSFORM_OPTIONS,
      targetOptions,
    );
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
