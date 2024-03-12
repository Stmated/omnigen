import {JavaTestUtils} from '@omnigen/duo-openrpc-java-test';
import {DEFAULT_MODEL_TRANSFORM_OPTIONS} from '@omnigen/core';
import {expect, test, describe, vi} from 'vitest';
import {DEFAULT_JAVA_OPTIONS, SerializationLibrary, SerializationPropertyNameMode} from '@omnigen/target-java';

describe('Error-Schema', () => {

  test('ErrorStructure', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure.json',
      {
        modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, elevateProperties: false, generifyTypes: true},
      },
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
    expect(errorResponse.foundFields).toEqual(['error']);

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100.java');
    expect(error100.foundFields).toEqual(['id']);
    expect(error100.foundMethods).toEqual(['getId', 'getJsonrpc']);
    expect(error100.foundSuperClasses).toEqual(['JsonRpcErrorResponse']);

    const error100error = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100error.foundFields).toEqual(['data']);

    const jsonRpcError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcError.java');
    expect(jsonRpcError.foundFields).toEqual(['code', 'message']);
  });

  test('ErrorStructure-1.1', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure-1.1.json', {
      javaOptions: {...DEFAULT_JAVA_OPTIONS, serializationLibrary: SerializationLibrary.JACKSON, serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED},
    });

    const errorResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcErrorResponse.java');
    expect(errorResponse.foundFields).toEqual(['error', 'id']);
    expect(errorResponse.foundMethods).toEqual(['getError', 'getId', 'getVersion']);

    const jsonRpcError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcError.java');
    expect(jsonRpcError.foundFields).toEqual(['code', 'error', 'message']);
    expect(jsonRpcError.foundTypes).toEqual(['int', 'JsonNode', 'String']);
    expect(jsonRpcError.foundSuperClasses).toEqual([]);
    expect(jsonRpcError.foundSuperInterfaces).toEqual([]);

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toEqual([]);
    expect(error100.foundSuperClasses).toEqual(['JsonRpcError']);
    expect(error100.foundTypes).toEqual(['JsonNode', 'String']);
  });

  test('ErrorStructure-Custom', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure-custom.json', {});
    const filenames = [...fileContents.keys()];

    expect(filenames).toContain('ListThingsError100Error.java');
    expect(filenames).toContain('JsonRpcCustomErrorPayload.java');
    expect(filenames).not.toContain('Data.java'); // Class for property 'Data' should be better named
    expect(filenames).toContain('JsonRpcCustomErrorPayloadData.java');

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toEqual([]);
    expect(error100.foundLiterals).toHaveLength(5);
    expect(error100.foundLiterals[0]).toEqual('"omnigen"');
    expect(error100.foundLiterals[2]).toEqual(100);

    const customError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcCustomErrorPayload.java');
    expect(customError.foundFields).toEqual(['data', 'method', 'signature', 'uuid', '_additionalProperties']);
  });
});
