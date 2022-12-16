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
    expect(errorResponse.foundFields).toEqual(['error', 'id', 'version']);

    const jsonRpcError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcError.java');
    expect(jsonRpcError.foundFields).toEqual(['code', 'error', 'message']);
    expect(jsonRpcError.foundTypes).toEqual(['int', 'JsonNode', 'String']);

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toEqual([
      // TODO: Add the expected ones
    ]);
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
    expect(filenames).toContain('JsonRpcCustomErrorPayloadData.java');

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toEqual([]);
    expect(error100.foundLiterals).toHaveLength(3);
    expect(error100.foundLiterals[0]).toEqual('"omnigen"');
    expect(error100.foundLiterals[2]).toEqual(100);

    const customError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcCustomErrorPayload.java');
    expect(customError.foundFields).toEqual(['data', 'method', 'signature', 'uuid', '_additionalProperties']);
  });
});
