import {DEFAULT_TEST_JAVA_OPTIONS, DEFAULT_TEST_TARGET_OPTIONS, JavaTestUtils, OpenRpcTestUtils} from '../util';
import {Java, JAVA_FEATURES, JavaInterpreter, JavaObjectNameResolver} from '@omnigen/target-java';
import {DEFAULT_MODEL_TRANSFORM_OPTIONS, DEFAULT_PACKAGE_OPTIONS, NameParts, OmniTypeKind} from '@omnigen/core';
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
    const classNames = compilationUnits.map(cu => cu.children[0].name.value);

    expect(classNames.sort()).toMatchSnapshot();
  });

  test('ensureGenericsAreBoxed', async () => {

    const interpreter = new JavaInterpreter(DEFAULT_JAVA_TARGET_OPT, JAVA_FEATURES);
    const result = await OpenRpcTestUtils.readExample('openrpc', 'primitive-generics.json', {
      modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generificationBoxAllowed: true},
    });

    const root = await interpreter.buildSyntaxTree(result.model, []);

    expect(root).toBeDefined();

    const compilationUnits = JavaTestUtils.getCompilationUnits(root);
    const fileNames = compilationUnits.map(it => it.children[0].name.value).sort();

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

    expect(asObject(giveIntGetDoubleRequestParams.children[0]).extends).toBeDefined();
    expect(asObject(giveNumberGetCharacterRequestParams.children[0]).extends).toBeDefined();
    expect(asObject(giveStringGetStringRequestParams.children[0]).extends).toBeDefined();

    const type = asObject(giveIntGetDoubleRequestParams.children[0]).extends?.types.children[0].omniType;
    if (type?.kind != OmniTypeKind.GENERIC_TARGET) throw Error(`Wrong kind: ${OmniUtil.describe(type)}`);

    const nameResolver = new JavaObjectNameResolver();

    expect(nameResolver.build({name: nameResolver.investigate({type: type.source.of, options: DEFAULT_JAVA_TARGET_OPT}), with: NameParts.NAME})).toEqual('JsonRpcRequestParams');
    expect(type.targetIdentifiers).toHaveLength(1);
    expect(OmniUtil.isPrimitive(type.targetIdentifiers[0].type)).toEqual(true);
  });

  test('ensureGenericsAreSkipped', async () => {

    const interpreter = new JavaInterpreter(DEFAULT_JAVA_TARGET_OPT, JAVA_FEATURES);
    const result = await OpenRpcTestUtils.readExample('openrpc', 'primitive-generics.json', {
      modelTransformOptions: {...DEFAULT_MODEL_TRANSFORM_OPTIONS, generificationBoxAllowed: false},
    });

    const root = await interpreter.buildSyntaxTree(result.model, []);

    expect(root).toBeDefined();

    const compilationUnits = JavaTestUtils.getCompilationUnits(root);
    const classNames = compilationUnits.map(it => it.children[0].name.value).sort();

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
    expect(asObject(giveNumberGetCharResponse.children[0]).extends).toBeDefined();
    expect(asObject(giveNumberGetCharResponse.children[0]).extends?.types.children[0].omniType?.kind).toEqual(OmniTypeKind.OBJECT);
  });
});

function asObject(identifiable: Java.Identifiable): Java.AbstractObjectDeclaration {

  if (identifiable instanceof Java.AbstractObjectDeclaration) {
    return identifiable;
  } else {
    throw new Error(`Should have been an object`);
  }
}
