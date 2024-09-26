import {JavaTestUtils} from '../util';
import {describe, test} from 'vitest';
import {ADDITIONAL_PROPERTIES_FIELD_NAME, SerializationLibrary} from '@omnigen/target-java';
import {SerializationPropertyNameMode} from '@omnigen/target-code';

describe('Error-Schema', () => {

  test('ErrorStructure', async ctx => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure.json', {
      modelTransformOptions: {elevateProperties: false, generifyTypes: true},
    });
    const filenames = [...fileContents.keys()].sort();

    // TODO: Figure out where ObjectThing.java is coming from
    ctx.expect(filenames).toEqual([
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
    ctx.expect(errorResponse.foundFields).toEqual(['error']);

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100.java');
    ctx.expect(error100.foundFields).toEqual(['id']);
    ctx.expect(error100.foundMethods).toEqual(['getId', 'getJsonrpc']);
    ctx.expect(error100.foundSuperClasses).toEqual(['JsonRpcErrorResponse']);

    const error100error = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    ctx.expect(error100error.foundFields).toEqual(['data']);

    const jsonRpcError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcError.java');
    ctx.expect(jsonRpcError.foundFields).toEqual(['code', 'message']);
  });

  test('ErrorStructure-1.1', async ctx => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure-1.1.json', {
      javaOptions: {
        serializationLibrary: SerializationLibrary.JACKSON,
        serializationPropertyNameMode: SerializationPropertyNameMode.IF_REQUIRED,
        immutable: true,
      },
    });

    const errorResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcErrorResponse.java');
    ctx.expect(errorResponse.foundFields).toEqual(['error', 'id']);
    ctx.expect(errorResponse.foundMethods).toEqual(['getError', 'getId', 'getVersion']);

    const jsonRpcError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcError.java');
    ctx.expect(jsonRpcError.foundFields).toEqual(['code', 'error', 'message']);
    ctx.expect(jsonRpcError.foundTypes).toEqual(['int', 'JsonNode', 'String']);
    ctx.expect(jsonRpcError.foundSuperClasses).toEqual([]);
    ctx.expect(jsonRpcError.foundSuperInterfaces).toEqual([]);

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    ctx.expect(error100.foundFields).toEqual([]);
    ctx.expect(error100.foundSuperClasses).toEqual(['JsonRpcError']);
    ctx.expect(error100.foundTypes).toHaveLength(2);
    ctx.expect(error100.foundTypes).toContain('JsonNode');
    ctx.expect(error100.foundTypes).toContain('String');
  });

  test('ErrorStructure-Custom', async ctx => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure-custom.json', {});
    const filenames = [...fileContents.keys()];

    ctx.expect(filenames).toContain('ListThingsError100Error.java');
    ctx.expect(filenames).toContain('JsonRpcCustomErrorPayload.java');
    ctx.expect(filenames).not.toContain('Data.java'); // Class for property 'Data' should be better named
    ctx.expect(filenames).toContain('JsonRpcCustomErrorPayloadData.java');

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    ctx.expect(error100.foundFields).toEqual([]);
    ctx.expect(error100.foundLiterals[0]).toEqual('"omnigen"');
    ctx.expect(error100.foundLiterals[4]).toEqual(100);

    const customError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcCustomErrorPayload.java');
    ctx.expect(customError.foundFields).toEqual(['data', 'method', 'signature', 'uuid', ADDITIONAL_PROPERTIES_FIELD_NAME]);
  });
});
