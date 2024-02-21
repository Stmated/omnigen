import {
  DEFAULT_TEST_JAVA_OPTIONS,
  DEFAULT_TEST_TARGET_OPTIONS,
  JavaTestUtils,
  OpenRpcTestUtils,
} from '@omnigen/duo-openrpc-java-test';
import {JAVA_FEATURES, JavaInterpreter, JavaUtil} from '@omnigen/target-java';
import {
  DEFAULT_MODEL_TRANSFORM_OPTIONS,
  DEFAULT_PACKAGE_OPTIONS,
  OmniTypeKind,
} from '@omnigen/core';
import {OmniUtil} from '@omnigen/core-util';
import {describe, expect, test} from 'vitest';

const DEFAULT_JAVA_TARGET_OPT = {...DEFAULT_TEST_JAVA_OPTIONS, ...DEFAULT_TEST_TARGET_OPTIONS, ...DEFAULT_PACKAGE_OPTIONS};

describe('JavaInterpreter', () => {

  test('ensureBasicParsingDoesNotCrash', async () => {

    const interpreter = new JavaInterpreter(DEFAULT_JAVA_TARGET_OPT, JAVA_FEATURES);
    const model = await OpenRpcTestUtils.readExample('openrpc', 'petstore-expanded.json', {
    });

    const interpretation = await interpreter.buildSyntaxTree(model.model, []);

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

    const interpreter = new JavaInterpreter(DEFAULT_JAVA_TARGET_OPT, JAVA_FEATURES);
    const result = await OpenRpcTestUtils.readExample('openrpc', 'primitive-generics.json', {
      modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generificationBoxAllowed: true},
    });

    const root = await interpreter.buildSyntaxTree(result.model, []);

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

    const interpreter = new JavaInterpreter(DEFAULT_JAVA_TARGET_OPT, JAVA_FEATURES);
    const result = await OpenRpcTestUtils.readExample('openrpc', 'primitive-generics.json', {
      modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generificationBoxAllowed: false},
    });

    const root = await interpreter.buildSyntaxTree(result.model, []);

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
