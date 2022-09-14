import {TestUtils} from '@test';
import {JavaInterpreter} from '@java/interpret/JavaInterpreter';
import {
  DEFAULT_JAVA_OPTIONS,
  JavaOptions,
  PrimitiveGenerificationChoice
} from '@java';
import {OmniTypeKind} from '@parse';
import {Naming} from '@parse/Naming';

describe('Test the structuring of GenericModel into a Java CST', () => {

  test('ensureBasicParsingDoesNotCrash', async () => {

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'petstore-expanded.json', DEFAULT_JAVA_OPTIONS);
    const interpretation = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    expect(interpretation).toBeDefined();

    expect(interpretation.children).toHaveLength(21);

    // TODO: We should assert stuff here :)
  });

  test('ensureGenericsAreSpecialized', async () => {

    const options: JavaOptions = {
      ...DEFAULT_JAVA_OPTIONS,
      ...{
        onPrimitiveGenerification: PrimitiveGenerificationChoice.SPECIALIZE
      }
    }

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'primitive-generics.json', options);
    const root = await interpreter.interpret(model, options);

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

    expect(Naming.unwrap(type.source.of.name)).toEqual("JsonRpcRequestParams");
    expect(type.targetIdentifiers).toHaveLength(1);

    // NOTE: This is currently "REFERENCE" -- but might change later.
    //        If we introduce a new kind of type that is a reference to a custom type created in CST.
    //        This is because it is quite ugly to use "REFERENCE" in case a transformer moved the referenced object.
    expect(type.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.REFERENCE);
  });

  test('ensureGenericsAreBoxed', async () => {

    const options: JavaOptions = {
      ...DEFAULT_JAVA_OPTIONS,
      ...{
        onPrimitiveGenerification: PrimitiveGenerificationChoice.WRAP_OR_BOX
      }
    }

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'primitive-generics.json', options);
    const root = await interpreter.interpret(model, options);

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
        'JsonRpcRequest',
        'JsonRpcRequestParams',
        'JsonRpcResponse'
      ]);

    const giveNumberGetCharResponse = TestUtils.getCompilationUnit(root, 'GiveIntGetDoubleRequestParams');
    expect(giveNumberGetCharResponse.object.extends).toBeDefined();

    const type = giveNumberGetCharResponse.object.extends?.type.omniType;
    if (type?.kind != OmniTypeKind.GENERIC_TARGET) throw Error(`Wrong kind`);

    expect(Naming.unwrap(type.source.of.name)).toEqual("JsonRpcRequestParams");
    expect(type.targetIdentifiers).toHaveLength(1);
    expect(type.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.PRIMITIVE);
  });

  test('ensureGenericsAreSkipped', async () => {

    const options: JavaOptions = {
      ...DEFAULT_JAVA_OPTIONS,
      ...{
        onPrimitiveGenerification: PrimitiveGenerificationChoice.ABORT
      }
    }

    const interpreter = new JavaInterpreter();
    const model = await TestUtils.readExample('openrpc', 'primitive-generics.json', options);
    const root = await interpreter.interpret(model, options);

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

    const model = await TestUtils.readExample('openrpc', 'multiple-inheritance.json', DEFAULT_JAVA_OPTIONS);
    const interpreter = new JavaInterpreter();
    const root = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    expect(root).toBeDefined();

    expect(root.children).toHaveLength(22);

    expect(model).toBeDefined();
  });

  test('Mappings', async () => {

    const model = await TestUtils.readExample('openrpc', 'mappings.json', DEFAULT_JAVA_OPTIONS);
    const interpreter = new JavaInterpreter();
    const root = await interpreter.interpret(model, DEFAULT_JAVA_OPTIONS);

    expect(root).toBeDefined();

    expect(root.children).toHaveLength(16);

    expect(model).toBeDefined();
  });
});
