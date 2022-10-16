// import {TestUtils} from '@omnigen/target-java';
import {DEFAULT_TEST_JAVA_OPTIONS, JavaTestUtils, OpenRpcTestUtils} from '@omnigen/duo-openrpc-java-test';
import {JavaInterpreter} from '@omnigen/target-java';
import {JavaOptions, JavaUtil} from '@omnigen/target-java';
import {OmniTypeKind} from '@omnigen/core';
import {DEFAULT_OPENRPC_OPTIONS} from '@omnigen/parser-openrpc';
import {PrimitiveGenerificationChoice, RealOptions} from '@omnigen/core';

describe('Test the structuring of GenericModel into a Java AST', () => {

  test('ensureBasicParsingDoesNotCrash', async () => {

    const interpreter = new JavaInterpreter();
    const model = await OpenRpcTestUtils.readExample('openrpc', 'petstore-expanded.json', DEFAULT_OPENRPC_OPTIONS, DEFAULT_TEST_JAVA_OPTIONS);
    const interpretation = await interpreter.buildSyntaxTree(model.model, [], DEFAULT_TEST_JAVA_OPTIONS);

    expect(interpretation).toBeDefined();

    expect(interpretation.children).toHaveLength(22);

    // TODO: We should assert stuff here :)
  });

  test('ensureGenericsAreSpecialized', async () => {

    const options: RealOptions<JavaOptions> = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      onPrimitiveGenerification: PrimitiveGenerificationChoice.SPECIALIZE,
    };

    const interpreter = new JavaInterpreter();
    const result = await OpenRpcTestUtils.readExample('openrpc', 'primitive-generics.json', DEFAULT_OPENRPC_OPTIONS, options);
    const root = await interpreter.buildSyntaxTree(result.model, [], options);

    expect(root).toBeDefined();

    const compilationUnits = JavaTestUtils.getCompilationUnits(root);
    const fileNames = compilationUnits.map(it => it.object.name.value);

    expect(fileNames.sort())
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

    const giveNumberGetCharResponse = JavaTestUtils.getCompilationUnit(root, 'GiveIntGetDoubleRequestParams');
    expect(giveNumberGetCharResponse.object.extends).toBeDefined();

    const type = giveNumberGetCharResponse.object.extends?.type.omniType;
    if (type?.kind != OmniTypeKind.GENERIC_TARGET) throw Error(`Wrong kind`);

    expect(JavaUtil.getClassName(type.source.of)).toEqual('JsonRpcRequestParams');
    expect(type.targetIdentifiers).toHaveLength(1);

    // NOTE: This is currently "REFERENCE" -- but might change later.
    //        If we introduce a new kind of type that is a reference to a custom type created in AST.
    //        This is because it is quite ugly to use "REFERENCE" in case a transformer moved the referenced object.
    expect(type.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.HARDCODED_REFERENCE);
  });

  test('ensureGenericsAreBoxed', async () => {

    const options: RealOptions<JavaOptions> = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      onPrimitiveGenerification: PrimitiveGenerificationChoice.WRAP_OR_BOX,
    };

    const interpreter = new JavaInterpreter();
    const result = await OpenRpcTestUtils.readExample('openrpc', 'primitive-generics.json', DEFAULT_OPENRPC_OPTIONS, options);
    const root = await interpreter.buildSyntaxTree(result.model, [], options);

    expect(root).toBeDefined();

    const compilationUnits = JavaTestUtils.getCompilationUnits(root);
    const fileNames = compilationUnits.map(it => it.object.name.value);

    expect(fileNames.sort())
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

    const type = giveNumberGetCharResponse.object.extends?.type.omniType;
    if (type?.kind != OmniTypeKind.GENERIC_TARGET) throw Error(`Wrong kind`);

    expect(JavaUtil.getClassName(type.source.of)).toEqual('JsonRpcRequestParams');
    expect(type.targetIdentifiers).toHaveLength(1);
    expect(type.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.PRIMITIVE);
  });

  test('ensureGenericsAreSkipped', async () => {

    const options: RealOptions<JavaOptions> = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      onPrimitiveGenerification: PrimitiveGenerificationChoice.ABORT,
    };

    const interpreter = new JavaInterpreter();
    const result = await OpenRpcTestUtils.readExample('openrpc', 'primitive-generics.json', DEFAULT_OPENRPC_OPTIONS, options);
    const root = await interpreter.buildSyntaxTree(result.model, [], options);

    expect(root).toBeDefined();

    const compilationUnits = JavaTestUtils.getCompilationUnits(root);
    const fileNames = compilationUnits.map(it => it.object.name.value);

    expect(fileNames.sort())
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

    const type = giveNumberGetCharResponse.object.extends?.type.omniType;
    expect(type?.kind).toEqual(OmniTypeKind.OBJECT);
  });

  test('Interfaces', async () => {

    const result = await OpenRpcTestUtils.readExample('openrpc', 'multiple-inheritance.json', DEFAULT_OPENRPC_OPTIONS, DEFAULT_TEST_JAVA_OPTIONS);
    const interpreter = new JavaInterpreter();
    const root = await interpreter.buildSyntaxTree(result.model, [], DEFAULT_TEST_JAVA_OPTIONS);

    expect(root).toBeDefined();

    expect(root.children).toHaveLength(23);

    expect(result).toBeDefined();
  });

  test('Mappings', async () => {

    const result = await OpenRpcTestUtils.readExample('openrpc', 'mappings.json', DEFAULT_OPENRPC_OPTIONS, DEFAULT_TEST_JAVA_OPTIONS);
    const interpreter = new JavaInterpreter();
    const root = await interpreter.buildSyntaxTree(result.model, [], DEFAULT_TEST_JAVA_OPTIONS);

    expect(root).toBeDefined();

    expect(root.children).toHaveLength(17);

    expect(result).toBeDefined();
  });
});
