import {TestUtils} from '@test';
import {JavaInterpreter} from '@java/interpret/JavaInterpreter';
import {
  DEFAULT_JAVA_OPTIONS,
  JavaUtil,
  IJavaOptions
} from '@java';
import {OmniTypeKind} from '@parse';
import {DEFAULT_OPENRPC_OPTIONS} from '@parse/openrpc';
import {RealOptions, PrimitiveGenerificationChoice} from '@options';
import {DEFAULT_TEST_JAVA_OPTIONS} from '../JavaTestUtils';

describe('Test the structuring of GenericModel into a Java CST', () => {

  test('ensureBasicParsingDoesNotCrash', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'petstore-expanded.json', DEFAULT_OPENRPC_OPTIONS, DEFAULT_TEST_JAVA_OPTIONS);
    const interpretation = await interpreter.buildSyntaxTree(model.model, [], DEFAULT_TEST_JAVA_OPTIONS);

    expect(interpretation).toBeDefined();

    expect(interpretation.children).toHaveLength(22);

    // TODO: We should assert stuff here :)
  });

  test('ensureGenericsAreSpecialized', async () => {

    const options: RealOptions<IJavaOptions> = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      ...{
        onPrimitiveGenerification: PrimitiveGenerificationChoice.SPECIALIZE
      }
    }

    const interpreter = new JavaInterpreter();
    const result = await TestUtils.readExample('openrpc', 'primitive-generics.json', DEFAULT_OPENRPC_OPTIONS, options);
    const root = await interpreter.buildSyntaxTree(result.model, [], options);

    expect(root).toBeDefined();

    const compilationUnits = TestUtils.getCompilationUnits(root);
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

    const giveNumberGetCharResponse = TestUtils.getCompilationUnit(root, 'GiveIntGetDoubleRequestParams');
    expect(giveNumberGetCharResponse.object.extends).toBeDefined();

    const type = giveNumberGetCharResponse.object.extends?.type.omniType;
    if (type?.kind != OmniTypeKind.GENERIC_TARGET) throw Error(`Wrong kind`);

    expect(JavaUtil.getClassName(type.source.of)).toEqual("JsonRpcRequestParams");
    expect(type.targetIdentifiers).toHaveLength(1);

    // NOTE: This is currently "REFERENCE" -- but might change later.
    //        If we introduce a new kind of type that is a reference to a custom type created in CST.
    //        This is because it is quite ugly to use "REFERENCE" in case a transformer moved the referenced object.
    expect(type.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.HARDCODED_REFERENCE);
  });

  test('ensureGenericsAreBoxed', async () => {

    const options: RealOptions<IJavaOptions> = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      ...{
        onPrimitiveGenerification: PrimitiveGenerificationChoice.WRAP_OR_BOX
      }
    }

    const interpreter = new JavaInterpreter();
    const result = await TestUtils.readExample('openrpc', 'primitive-generics.json', DEFAULT_OPENRPC_OPTIONS, options);
    const root = await interpreter.buildSyntaxTree(result.model, [], options);

    expect(root).toBeDefined();

    const compilationUnits = TestUtils.getCompilationUnits(root);
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
        'JsonRpcResponse'
      ]);

    const giveNumberGetCharResponse = TestUtils.getCompilationUnit(root, 'GiveIntGetDoubleRequestParams');
    expect(giveNumberGetCharResponse.object.extends).toBeDefined();

    const type = giveNumberGetCharResponse.object.extends?.type.omniType;
    if (type?.kind != OmniTypeKind.GENERIC_TARGET) throw Error(`Wrong kind`);

    expect(JavaUtil.getClassName(type.source.of)).toEqual("JsonRpcRequestParams");
    expect(type.targetIdentifiers).toHaveLength(1);
    expect(type.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.PRIMITIVE);
  });

  test('ensureGenericsAreSkipped', async () => {

    const options: RealOptions<IJavaOptions> = {
      ...DEFAULT_TEST_JAVA_OPTIONS,
      ...{
        onPrimitiveGenerification: PrimitiveGenerificationChoice.ABORT
      }
    }

    const interpreter = new JavaInterpreter();
    const result = await TestUtils.readExample('openrpc', 'primitive-generics.json', DEFAULT_OPENRPC_OPTIONS, options);
    const root = await interpreter.buildSyntaxTree(result.model, [], options);

    expect(root).toBeDefined();

    const compilationUnits = TestUtils.getCompilationUnits(root);
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
        'JsonRpcResponse'
      ]);

    const giveNumberGetCharResponse = TestUtils.getCompilationUnit(root, 'GiveIntGetDoubleRequestParams');
    expect(giveNumberGetCharResponse.object.extends).toBeDefined();

    const type = giveNumberGetCharResponse.object.extends?.type.omniType;
    expect(type?.kind).toEqual(OmniTypeKind.OBJECT);
  });

  test('Interfaces', async () => {

    const result = await TestUtils.readExample('openrpc', 'multiple-inheritance.json', DEFAULT_OPENRPC_OPTIONS, DEFAULT_TEST_JAVA_OPTIONS);
    const interpreter = new JavaInterpreter();
    const root = await interpreter.buildSyntaxTree(result.model, [], DEFAULT_TEST_JAVA_OPTIONS);

    expect(root).toBeDefined();

    expect(root.children).toHaveLength(23);

    expect(result).toBeDefined();
  });

  test('Mappings', async () => {

    const result = await TestUtils.readExample('openrpc', 'mappings.json', DEFAULT_OPENRPC_OPTIONS, DEFAULT_TEST_JAVA_OPTIONS);
    const interpreter = new JavaInterpreter();
    const root = await interpreter.buildSyntaxTree(result.model, [], DEFAULT_TEST_JAVA_OPTIONS);

    expect(root).toBeDefined();

    expect(root.children).toHaveLength(17);

    expect(result).toBeDefined();
  });
});
