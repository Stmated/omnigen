import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils, OpenRpcTestUtils} from '@omnigen/duo-openrpc-java-test';
import {JAVA_FEATURES, JavaInterpreter, JavaOptions, JavaUtil} from '@omnigen/target-java';
import {DEFAULT_MODEL_TRANSFORM_OPTIONS, ModelTransformOptions, OmniTypeKind, OmniUtil} from '@omnigen/core';
import {DEFAULT_OPENRPC_OPTIONS} from '@omnigen/parser-openrpc';

describe('JavaInterpreter', () => {

  test('ensureBasicParsingDoesNotCrash', async () => {

    const options = DEFAULT_TEST_JAVA_OPTIONS;
    const interpreter = new JavaInterpreter(options);
    const model = await OpenRpcTestUtils.readExample('openrpc', 'petstore-expanded.json',
      DEFAULT_OPENRPC_OPTIONS,
      DEFAULT_MODEL_TRANSFORM_OPTIONS,
      options,
    );

    const interpretation = await interpreter.buildSyntaxTree(model.model, [], model.options, JAVA_FEATURES);

    expect(interpretation).toBeDefined();

    const compilationUnits = JavaTestUtils.getCompilationUnits(interpretation);
    const classNames = compilationUnits.map(cu => cu.object.name.value).sort();

    expect(classNames).toEqual([
      'CreatePetRequest',
      'CreatePetRequestParams',
      'CreatePetResponse',
      'DeletePetByIdRequest',
      'DeletePetByIdRequestParams',
      'DeletePetByIdResponse',
      'DeletePetByIdResponsePayload',
      'ErrorUnknown',
      'ErrorUnknownError',
      'GetPetByIdRequest',
      'GetPetByIdRequestParams',
      'GetPetByIdResponse',
      'GetPetsRequest',
      'GetPetsRequestParams',
      'GetPetsResponse',
      'JsonRpcError',
      'JsonRpcErrorResponse',
      'JsonRpcRequest',
      'JsonRpcRequestParams',
      'JsonRpcResponse',
      'NewPet',
      'Pet',
    ]);
  });

  test('ensureGenericsAreBoxed', async () => {

    const transformerOptions: ModelTransformOptions = {
      ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
      generificationBoxAllowed: true,
    };

    const targetOptions: JavaOptions = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
    };

    const interpreter = new JavaInterpreter(targetOptions);
    const result = await OpenRpcTestUtils.readExample('openrpc', 'primitive-generics.json',
      DEFAULT_OPENRPC_OPTIONS,
      transformerOptions,
      targetOptions,
    );

    const root = await interpreter.buildSyntaxTree(result.model, [], result.options, JAVA_FEATURES);

    expect(root).toBeDefined();

    const compilationUnits = JavaTestUtils.getCompilationUnits(root);
    const fileNames = compilationUnits.map(it => it.object.name.value).sort();

    expect(fileNames)
      .toEqual([
        'ErrorUnknown',
        'ErrorUnknownError',
        'GiveIntGetDoubleRequest',
        'GiveIntGetDoubleRequestParams',
        'GiveIntGetDoubleResponse',
        'GiveNumberGetCharRequest',
        'GiveNumberGetCharRequestParams',
        'GiveNumberGetCharResponse',
        'GiveStringGetStringRequest',
        'GiveStringGetStringRequestParams',
        'GiveStringGetStringResponse',
        'JsonRpcError',
        'JsonRpcErrorResponse',
        'JsonRpcRequest',
        'JsonRpcRequestParams',
        'JsonRpcResponse',
      ]);

    const giveIntGetDoubleRequestParams = JavaTestUtils.getCompilationUnit(root, 'GiveIntGetDoubleRequestParams');
    const giveNumberGetCharacterRequestParams = JavaTestUtils.getCompilationUnit(root, 'GiveNumberGetCharRequestParams');
    const giveStringGetStringRequestParams = JavaTestUtils.getCompilationUnit(root, 'GiveStringGetStringRequestParams');

    expect(giveIntGetDoubleRequestParams.object.extends).toBeDefined();
    expect(giveNumberGetCharacterRequestParams.object.extends).toBeDefined();
    expect(giveStringGetStringRequestParams.object.extends).toBeDefined();

    const type = giveIntGetDoubleRequestParams.object.extends?.type.omniType;
    if (type?.kind != OmniTypeKind.GENERIC_TARGET) throw Error(`Wrong kind: ${OmniUtil.describe(type)}`);

    expect(JavaUtil.getClassName(type.source.of)).toEqual('JsonRpcRequestParams');
    expect(type.targetIdentifiers).toHaveLength(1);
    expect(type.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.PRIMITIVE);

    // TODO: Check that JsonRpcRequest has the correct generics!!!!!
  });

  test('ensureGenericsAreSkipped', async () => {

    const transformerOptions: ModelTransformOptions = {
      ...DEFAULT_MODEL_TRANSFORM_OPTIONS,
      generificationBoxAllowed: false,
    };

    const targetOptions: JavaOptions = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
    };

    const interpreter = new JavaInterpreter(targetOptions);
    const result = await OpenRpcTestUtils.readExample('openrpc', 'primitive-generics.json',
      DEFAULT_OPENRPC_OPTIONS,
      transformerOptions,
      targetOptions,
    );

    const root = await interpreter.buildSyntaxTree(result.model, [], result.options, JAVA_FEATURES);

    expect(root).toBeDefined();

    const compilationUnits = JavaTestUtils.getCompilationUnits(root);
    const classNames = compilationUnits.map(it => it.object.name.value).sort();

    expect(classNames)
      .toEqual([
        'ErrorUnknown',
        'ErrorUnknownError',
        'GiveIntGetDoubleRequest',
        'GiveIntGetDoubleRequestParams',
        'GiveIntGetDoubleResponse',
        'GiveNumberGetCharRequest',
        'GiveNumberGetCharRequestParams',
        'GiveNumberGetCharResponse',
        'GiveStringGetStringRequest',
        'GiveStringGetStringRequestParams',
        'GiveStringGetStringResponse',
        'JsonRpcError',
        'JsonRpcErrorResponse',
        'JsonRpcRequest',
        'JsonRpcRequestParams',
        'JsonRpcResponse',
      ]);

    const giveNumberGetCharResponse = JavaTestUtils.getCompilationUnit(root, 'GiveIntGetDoubleRequestParams');
    expect(giveNumberGetCharResponse.object.extends).toBeDefined();
    expect(giveNumberGetCharResponse.object.extends?.type.omniType?.kind).toEqual(OmniTypeKind.OBJECT);
  });
});
