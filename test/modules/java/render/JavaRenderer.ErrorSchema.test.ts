import {JavaTestUtils} from '../JavaTestUtils';

describe('Java Rendering', () => {

  jest.setTimeout(10_000);

  test('ErrorStructure', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure.json');

    const filenames = [...fileContents.keys()];
    expect(filenames).toHaveLength(13);
    expect(filenames).toContain('ErrorUnknown.java');
    expect(filenames).toContain('ErrorUnknownError.java');
    expect(filenames).toContain('JsonRpcError.java');
    expect(filenames).toContain('JsonRpcErrorResponse.java');
    expect(filenames).toContain('ListThingsError100.java');
    expect(filenames).toContain('ListThingsError100Error.java');

    const errorResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcErrorResponse.java');
    expect(errorResponse.foundFields[0].names[0]).toEqual("jsonrpc");

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toHaveLength(3);
    expect(error100.foundFields[0].names[0]).toEqual("code");
    expect(error100.foundFields[1].names[0]).toEqual("message");
    expect(error100.foundFields[2].names[0]).toEqual("data");
  });

  test('ErrorStructure-1.1', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure-1.1.json');
    const errorResponse = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcErrorResponse.java');

    expect(errorResponse.foundFields[0].names[0]).toEqual("version");

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toHaveLength(4);
  });

  test('ErrorStructure-Custom', async () => {

    const fileContents = await JavaTestUtils.getFileContentsFromFile('error-structure-custom.json');
    const filenames = [...fileContents.keys()];

    expect(filenames).toContain('ListThingsError100Error.java');
    expect(filenames).toContain('JsonRpcCustomErrorPayload.java');
    expect(filenames).not.toContain('Data.java'); // Class for property 'Data' should be better named
    expect(filenames).toContain('JsonRpcCustomErrorPayload.java');

    const error100 = JavaTestUtils.getParsedContent(fileContents, 'ListThingsError100Error.java');
    expect(error100.foundFields).toHaveLength(4);
    expect(error100.foundFields[0].names[0]).toEqual("code");
    expect(error100.foundFields[1].names[0]).toEqual("message");
    expect(error100.foundFields[2].names[0]).toEqual("error");
    expect(error100.foundFields[3].names[0]).toEqual("name");
    expect(error100.foundLiterals[7]).toEqual("\"JSONRPCError\"");

    const customError = JavaTestUtils.getParsedContent(fileContents, 'JsonRpcCustomErrorPayload.java');
    expect(customError.foundFields).toHaveLength(5);
    expect(customError.foundFields[0].names[0]).toEqual('signature');
    expect(customError.foundFields[1].names[0]).toEqual('uuid');
    expect(customError.foundFields[2].names[0]).toEqual('method');
    expect(customError.foundFields[3].names[0]).toEqual('data');
    expect(customError.foundFields[4].names[0]).toEqual('_additionalProperties');
  });
});
