import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils, OpenRpcTestUtils} from '@omnigen/duo-openrpc-java-test';
import {JavaInterpreter} from '@omnigen/target-java';
import {JavaOptions, JavaUtil} from '@omnigen/target-java';
import {OmniTypeKind, OmniUtil} from '@omnigen/core';
import {DEFAULT_OPENRPC_OPTIONS} from '@omnigen/parser-openrpc';
import {OmniPrimitiveBoxMode} from '@omnigen/core';

describe('JavaInterpreter', () => {

  test('ensureBasicParsingDoesNotCrash', async () => {

    const options = DEFAULT_TEST_JAVA_OPTIONS;
    const interpreter = new JavaInterpreter(options);
    const model = await OpenRpcTestUtils.readExample('openrpc', 'petstore-expanded.json', DEFAULT_OPENRPC_OPTIONS, options);
    const interpretation = await interpreter.buildSyntaxTree(model.model, [], model.options);

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

  test('ensureGenericsAreSpecialized', async () => {

    const options: JavaOptions = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      generificationBoxMode: OmniPrimitiveBoxMode.WRAP,
    };

    const interpreter = new JavaInterpreter(options);
    const result = await OpenRpcTestUtils.readExample('openrpc', 'primitive-generics.json', DEFAULT_OPENRPC_OPTIONS, options);
    const root = await interpreter.buildSyntaxTree(result.model, [], result.options);

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
        'PrimitiveChar',
        'PrimitiveDouble',
        'PrimitiveInt',
      ]);

    const givIntGetDoubleRequestParams = JavaTestUtils.getCompilationUnit(root, 'GiveIntGetDoubleRequestParams');
    expect(givIntGetDoubleRequestParams.object.extends).toBeDefined();

    const type = givIntGetDoubleRequestParams.object.extends?.type.omniType;
    if (type?.kind != OmniTypeKind.GENERIC_TARGET) throw Error(`Wrong kind`);

    expect(JavaUtil.getClassName(type.source.of)).toEqual('JsonRpcRequestParams');
    expect(type.targetIdentifiers).toHaveLength(1);

    // NOTE: This is currently "REFERENCE" -- but might change later.
    //        If we introduce a new kind of type that is a reference to a custom type created in AST.
    //        This is because it is quite ugly to use "REFERENCE" in case a transformer moved the referenced object.
    expect(type.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.HARDCODED_REFERENCE);
  });

  test('ensureGenericsAreBoxed', async () => {

    const options: JavaOptions = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      generificationBoxMode: OmniPrimitiveBoxMode.BOX,
    };

    const interpreter = new JavaInterpreter(options);
    const result = await OpenRpcTestUtils.readExample('openrpc', 'primitive-generics.json', DEFAULT_OPENRPC_OPTIONS, options);
    const root = await interpreter.buildSyntaxTree(result.model, [], result.options);

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
    expect(giveIntGetDoubleRequestParams.object.extends).toBeDefined();

    const type = giveIntGetDoubleRequestParams.object.extends?.type.omniType;
    if (type?.kind != OmniTypeKind.GENERIC_TARGET) throw Error(`Wrong kind: ${OmniUtil.describe(type)}`);

    expect(JavaUtil.getClassName(type.source.of)).toEqual('JsonRpcRequestParams');
    expect(type.targetIdentifiers).toHaveLength(1);
    expect(type.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.PRIMITIVE);

    // TODO: Check that JsonRpcRequest has the correct generics!!!!!
  });

  test('ensureGenericsAreSkipped', async () => {

    const options: JavaOptions = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      generificationBoxAllowed: false,
    };

    const interpreter = new JavaInterpreter(options);
    const result = await OpenRpcTestUtils.readExample('openrpc', 'primitive-generics.json', DEFAULT_OPENRPC_OPTIONS, options);
    const root = await interpreter.buildSyntaxTree(result.model, [], result.options);

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

  test('Interfaces', async () => {

    const result = await OpenRpcTestUtils.readExample('openrpc', 'multiple-inheritance.json');
    const interpreter = new JavaInterpreter(result.options);
    const root = await interpreter.buildSyntaxTree(result.model, [], result.options);

    expect(root).toBeDefined();

    expect(root.children).toHaveLength(23);

    expect(result).toBeDefined();
  });

  test('Mappings', async () => {

    const result = await OpenRpcTestUtils.readExample('openrpc', 'mappings.json');
    const interpreter = new JavaInterpreter(result.options);
    const root = await interpreter.buildSyntaxTree(result.model, [], result.options);

    expect(root).toBeDefined();

    expect(root.children).toHaveLength(17);

    expect(result).toBeDefined();
  });
});
