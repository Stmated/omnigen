import {TestUtils} from '@omnigen/utils-test';
import {JavaUtil} from '@omnigen/target-java';
import {
  type OmniModel,
  OmniTypeKind,
  DEFAULT_PARSER_OPTIONS,
  DEFAULT_MODEL_TRANSFORM_OPTIONS,
} from '@omnigen/core';
import {
  GenericsModelTransformer,
  OmniUtil,
} from '@omnigen/core-util';
import {expect, test, describe} from 'vitest';

describe('Test CompositionDependencyUtil', () => {

  test('ensureNothingChanges', async () => {

    const transformer = new GenericsModelTransformer();

    const model: OmniModel = {
      name: 'model',
      schemaType: 'other',
      schemaVersion: '1.0',
      version: '1.0',
      endpoints: [],
      servers: [],
      types: [
        TestUtils.obj('A'),
      ],
    };

    const realParserOpt = DEFAULT_PARSER_OPTIONS;
    const realTransformOpt = DEFAULT_MODEL_TRANSFORM_OPTIONS;

    transformer.transformModel({
      model: model,
      options: {...realParserOpt, ...realTransformOpt},
    });

    expect(model.types).toHaveLength(1);

    const type = model.types[0];

    expect(JavaUtil.getClassName(type)).toEqual('A');
    if (type.kind != OmniTypeKind.OBJECT) throw new Error(`Should be an object`);

    expect(type.properties).toEqual([]);
  });

  test('ensureGenericsAdded', async () => {

    const transformer = new GenericsModelTransformer();

    const a = TestUtils.obj('A', undefined, [
      TestUtils.prop('propA', {
        kind: OmniTypeKind.INTEGER,
      }),
    ]);

    const aa = TestUtils.obj('aa', a, [
      TestUtils.prop('propX', {
        kind: OmniTypeKind.INTEGER,
      }),
    ]);
    const ab = TestUtils.obj('ab', a, [
      TestUtils.prop('propX', {
        kind: OmniTypeKind.DOUBLE,
      }),
    ]);

    const model: OmniModel = {
      name: 'model',
      schemaType: 'other',
      schemaVersion: '1.0',
      version: '1.0',
      endpoints: [],
      servers: [],
      types: [
        a,
        aa,
        ab,
      ],
    };

    // TODO: Will not work -- will need to call the 2nd pass
    transformer.transformModel({
      model: model,
      options: {...DEFAULT_PARSER_OPTIONS, ...DEFAULT_MODEL_TRANSFORM_OPTIONS},
    });

    expect(model.types).toHaveLength(3);

    if (model.types[0].kind != OmniTypeKind.GENERIC_SOURCE) {
      throw new Error(`Should be generic source not ${OmniUtil.describe(model.types[0])}`);
    }
    if (model.types[1].kind != OmniTypeKind.OBJECT) throw new Error(`Should be an object not ${OmniUtil.describe(model.types[1])}`);
    if (model.types[2].kind != OmniTypeKind.OBJECT) throw new Error(`Should be an object not ${OmniUtil.describe(model.types[2])}`);

    expect(JavaUtil.getClassName(model.types[0])).toEqual('A');
    expect(JavaUtil.getClassName(model.types[0].of)).toEqual('A');
    expect(model.types[0].of).toEqual(a);

    if (model.types[1].extendedBy?.kind != OmniTypeKind.GENERIC_TARGET) throw new Error(`Wrong kind`);
    if (model.types[2].extendedBy?.kind != OmniTypeKind.GENERIC_TARGET) throw new Error(`Wrong kind`);

    // expect(model.types[0].kind).toEqual(OmniTypeKind.GENERIC_TARGET);
    // expect(model.types[1].extendedBy.generics).toHaveLength(1);
    // expect(model.types[2].extendedBy.generics).toHaveLength(1);

    expect(model.types[1].extendedBy.source).toEqual(model.types[0]);
    expect(model.types[2].extendedBy.source).toEqual(model.types[0]);

    // if (model.types[0].generics[0].kind != OmniTypeKind.PRIMITIVE) throw new Error(`Wrong kind`);
    if (!OmniUtil.isPrimitive(model.types[1].extendedBy.targetIdentifiers[0].type)) throw new Error(`Wrong kind`);
    if (!OmniUtil.isPrimitive(model.types[2].extendedBy.targetIdentifiers[0].type)) throw new Error(`Wrong kind`);

    expect(model.types[1].extendedBy.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.INTEGER);
    expect(model.types[2].extendedBy.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.DOUBLE);

    if (!model.types[0].sourceIdentifiers[0].upperBound) throw new Error(`No upper bound`);
    if (!OmniUtil.isPrimitive(model.types[0].sourceIdentifiers[0].upperBound)) throw new Error(`Wrong kind`);

    expect(model.types[0].sourceIdentifiers[0].upperBound.kind).toEqual(OmniTypeKind.DOUBLE);
  });
});
