import {TestUtils} from '../../../TestUtils';
import {DEFAULT_OPENRPC_OPTIONS} from '@parse/openrpc';
import {IJavaOptions} from '@java';
import {OmniModelMerge, OmniUtil, Naming} from '@parse';
import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils} from '../JavaTestUtils';

describe('Reuse Common Types', () => {

  test('error-structure-1.0+1.1', async () => {

    const result10 = (await TestUtils.readExample(
      'openrpc', 'error-structure.json', DEFAULT_OPENRPC_OPTIONS, {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        ...{
          package: 'com.error10'
        }
      }
    ));
    const result11 = (await TestUtils.readExample(
      'openrpc', 'error-structure-1.1.json', DEFAULT_OPENRPC_OPTIONS, {
        ...DEFAULT_TEST_JAVA_OPTIONS,
        ...{
          package: 'com.error11'
        }
      }
    ));

    const resultMerged = OmniModelMerge.merge<IJavaOptions>([result10, result11], {
      // TODO: Add capability of figuring out package automatically, common denominator for all given options
      package: 'com.common',
    });

    // The merged model should (for now, we will see later) be virtually empty of functionality.
    // It is up to each respective model to output itself as normally, but to be aware that types are common.
    // This can for example be done at the file writing stage, where if the other model has already written
    // the common type to disk, then we do not need to do so again if we encounter it.
    expect(resultMerged).toBeDefined();
    expect(resultMerged.model.types).toHaveLength(3);
    expect(resultMerged.model.endpoints).toHaveLength(0);

    expect(OmniUtil.getTypeName(resultMerged.model.types[0])).toEqual('JsonRpcRequestParams');

    // The names for this type has not been solidified/gone through the syntax tree transformers.
    // So it is still the more schema-like names, and not the target class names.
    expect(OmniUtil.getTypeName(resultMerged.model.types[1])).toEqual('list_thingsRequestParams');
    expect(Naming.unwrapToFirstDefined(OmniUtil.getTypeName(resultMerged.model.types[2]))).toEqual('/components/schemas/Thing');

    const rootNodeCommon = (await JavaTestUtils.getRootNodeFromParseResult(resultMerged));
    const filesCommon = (await JavaTestUtils.getFileContentsFromRootNode(rootNodeCommon, resultMerged.options));
    const files10 = (await JavaTestUtils.getFileContentsFromParseResult(result10, [{node: rootNodeCommon, options: resultMerged.options}]));
    const files11 = (await JavaTestUtils.getFileContentsFromParseResult(result11, [{node: rootNodeCommon, options: resultMerged.options}]));

    const filesCommonNames = [...filesCommon.keys()].sort();
    const files10Names = [...files10.keys()].sort();
    const files11Names = [...files11.keys()].sort();

    expect(filesCommonNames).toEqual([
      'JsonRpcRequestParams.java',
      'ListThingsRequestParams.java',
      'Thing.java',
    ]);

    expect(files10Names).toEqual([
      "ErrorUnknown.java",
      "JsonRpcError.java",
      "JsonRpcErrorResponse.java",
      "JsonRpcRequest.java",
      "JsonRpcResponse.java",
      "ListThingsError100.java",
    ]);

    expect(files11Names).toEqual([
      "ErrorUnknown.java",
      "JsonRpcError.java",
      "JsonRpcErrorResponse.java",
      "JsonRpcRequest.java",
      "JsonRpcResponse.java",
      "ListThingsError100.java",
    ]);

    const jsonRpcRequestParamsCommon = JavaTestUtils.getParsedContent(filesCommon, 'JsonRpcRequestParams.java');
    expect(jsonRpcRequestParamsCommon.foundPackage).toEqual('com.common');
    expect(jsonRpcRequestParamsCommon.foundImports).toEqual(['javax.annotation.Generated']);

    // ListThingsRequestParams is an inner class inside JsonRpcRequestParams.
    // So here we can make sure that the import is correctly resolved.

    const jsonRpcRequest10 = JavaTestUtils.getParsedContent(files10, 'JsonRpcRequest.java');
    expect(jsonRpcRequest10.foundPackage).toEqual('com.error10');
    expect(jsonRpcRequest10.foundImports).toEqual([
      'com.common.JsonRpcRequestParams.ListThingsRequestParams',
      'javax.annotation.Generated',
    ]);

    const jsonRpcRequest11 = JavaTestUtils.getParsedContent(files11, 'JsonRpcRequest.java');
    expect(jsonRpcRequest11.foundPackage).toEqual('com.error11');
    expect(jsonRpcRequest11.foundImports).toEqual([
      'com.common.JsonRpcRequestParams.ListThingsRequestParams',
      'javax.annotation.Generated',
    ]);

    const ListThingsError10011 = JavaTestUtils.getParsedContent(files11, 'ListThingsError100.java');
    expect(ListThingsError10011.foundPackage).toEqual('com.error11');
    expect(ListThingsError10011.foundImports).toEqual([
      'com.fasterxml.jackson.databind.JsonNode',
      'javax.annotation.Generated',
    ]);
    expect(ListThingsError10011.foundTypes).toEqual([
      'ListThingsError100.ListThingsError100Error',
      'String',
      'Integer',
      'int',
      'JsonNode'
    ]);
  });
});
