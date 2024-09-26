import {TestUtils} from '@omnigen/utils-test';
import {JavaObjectNameResolver, JavaOptions} from '@omnigen/target-java';
import {
  DEFAULT_MODEL_TRANSFORM_OPTIONS,
  DEFAULT_PACKAGE_OPTIONS,
  DEFAULT_PARSER_OPTIONS,
  DEFAULT_TARGET_OPTIONS,
  NameParts,
  OMNI_GENERIC_FEATURES,
  OmniItemKind,
  type OmniModel,
  OmniTypeKind,
  PackageOptions,
} from '@omnigen/api';
import {GenericsModelTransformer, OmniUtil} from '@omnigen/core';
import {describe, test} from 'vitest';
import {DEFAULT_TEST_JAVA_OPTIONS} from '../util';

describe('Generics', () => {

  test.concurrent('ensureNothingChanges', async ctx => {

    const transformer = new GenericsModelTransformer();

    const model: OmniModel = {
      kind: OmniItemKind.MODEL,
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

    transformer.transformModel2ndPass({
      model: model,
      options: {...DEFAULT_PARSER_OPTIONS, ...DEFAULT_MODEL_TRANSFORM_OPTIONS, ...DEFAULT_TARGET_OPTIONS},
      features: OMNI_GENERIC_FEATURES,
    });

    ctx.expect(model.types).toHaveLength(1);

    const type = model.types[0];

    const nameResolver = new JavaObjectNameResolver();
    const nameOptions: PackageOptions & JavaOptions = {...DEFAULT_PACKAGE_OPTIONS, ...DEFAULT_TEST_JAVA_OPTIONS};

    ctx.expect(nameResolver.build({name: nameResolver.investigate({type: type, options: nameOptions}), with: NameParts.NAME})).toEqual('A');
    if (type.kind != OmniTypeKind.OBJECT) throw new Error(`Should be an object`);

    ctx.expect(type.properties).toEqual([]);
  });

  test.concurrent('ensureGenericsAdded', async ctx => {

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
      kind: OmniItemKind.MODEL,
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

    transformer.transformModel2ndPass({
      model: model,
      options: {...DEFAULT_PARSER_OPTIONS, ...DEFAULT_MODEL_TRANSFORM_OPTIONS, ...DEFAULT_TARGET_OPTIONS},
      features: OMNI_GENERIC_FEATURES,
    });

    ctx.expect(model.types).toHaveLength(3);

    if (model.types[0].kind != OmniTypeKind.GENERIC_SOURCE) {
      throw new Error(`Should be generic source not ${OmniUtil.describe(model.types[0])}`);
    }
    if (model.types[1].kind != OmniTypeKind.OBJECT) throw new Error(`Should be an object not ${OmniUtil.describe(model.types[1])}`);
    if (model.types[2].kind != OmniTypeKind.OBJECT) throw new Error(`Should be an object not ${OmniUtil.describe(model.types[2])}`);

    const nameResolver = new JavaObjectNameResolver();
    const nameOptions: PackageOptions & JavaOptions = {...DEFAULT_PACKAGE_OPTIONS, ...DEFAULT_TEST_JAVA_OPTIONS};

    ctx.expect(nameResolver.build({name: nameResolver.investigate({type: model.types[0], options: nameOptions}), with: NameParts.NAME})).toEqual('A');
    ctx.expect(nameResolver.build({name: nameResolver.investigate({type: model.types[0].of, options: nameOptions}), with: NameParts.NAME})).toEqual('A');
    ctx.expect(model.types[0].of).toEqual(a);

    if (model.types[1].extendedBy?.kind != OmniTypeKind.GENERIC_TARGET) throw new Error(`Wrong kind`);
    if (model.types[2].extendedBy?.kind != OmniTypeKind.GENERIC_TARGET) throw new Error(`Wrong kind`);

    ctx.expect(model.types[1].extendedBy.source).toEqual(model.types[0]);
    ctx.expect(model.types[2].extendedBy.source).toEqual(model.types[0]);

    if (!OmniUtil.isPrimitive(model.types[1].extendedBy.targetIdentifiers[0].type)) throw new Error(`Wrong kind`);
    if (!OmniUtil.isPrimitive(model.types[2].extendedBy.targetIdentifiers[0].type)) throw new Error(`Wrong kind`);

    ctx.expect(model.types[1].extendedBy.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.INTEGER);
    ctx.expect(model.types[2].extendedBy.targetIdentifiers[0].type.kind).toEqual(OmniTypeKind.DOUBLE);

    if (!model.types[0].sourceIdentifiers[0].upperBound) throw new Error(`No upper bound`);
    if (!OmniUtil.isPrimitive(model.types[0].sourceIdentifiers[0].upperBound)) throw new Error(`Wrong kind`);

    ctx.expect(model.types[0].sourceIdentifiers[0].upperBound.kind).toEqual(OmniTypeKind.DOUBLE);
  });
});
