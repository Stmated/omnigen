import {CommonDenominatorType, OMNI_GENERIC_FEATURES, OmniItemKind, OmniPrimitiveType, OmniProperty, OmniType, OmniTypeKind, TypeDiffKind} from '@omnigen/api';
import {Diff, DiffKind, OmniUtil, PropertyTypeDiff} from './OmniUtil';
import {describe, test, TaskContext, TestContext} from 'vitest';

describe('OmniUtil', () => {

  test('EqualityLevel Primitives', async ctx => {

    ctx.expect(expectCommon(
      {kind: OmniTypeKind.STRING},
      {kind: OmniTypeKind.STRING},
    ).diffs ?? []).toEqual([]);

    ctx.expect(expectCommon(
      {kind: OmniTypeKind.INTEGER},
      {kind: OmniTypeKind.DOUBLE},
    ).diffs ?? []).toEqual([TypeDiffKind.SIZE, TypeDiffKind.PRECISION]);

    // With default features, we cannot handle the literal types
    ctx.expect(expectCommon(
      {kind: OmniTypeKind.STRING, literal: true, value: 'hello'},
      {kind: OmniTypeKind.STRING, literal: true, value: 'bye'},
      {...OMNI_GENERIC_FEATURES, primitiveGenerics: false, literalTypes: true},
    ).diffs).toEqual([TypeDiffKind.POLYMORPHIC_LITERAL]);

    // With Java, the literal types become the same type in the signature
    const literalString = expectCommon(
      {kind: OmniTypeKind.STRING, literal: true, value: 'hello'},
      {kind: OmniTypeKind.STRING, literal: true, value: 'bye'},
      {...OMNI_GENERIC_FEATURES, primitiveGenerics: false, literalTypes: false},
    );

    // The diff itself is still a POLYMORPHIC_LITERAL, even though for the target the types are fundamentally incompatible.
    // But it is up to the caller to decide what the diff means in its context.
    ctx.expect(literalString.diffs).toEqual([TypeDiffKind.POLYMORPHIC_LITERAL]);
    ctx.expect(OmniUtil.isPrimitive(literalString.type)).toEqual(true);

    const literalPrimitiveString = (literalString.type as OmniPrimitiveType);
    ctx.expect(literalPrimitiveString.kind).toEqual(OmniTypeKind.STRING);
    ctx.expect(literalPrimitiveString.value).toBeUndefined();
    ctx.expect(literalPrimitiveString.literal).toBeUndefined();

    expectA(
      ctx,
      {kind: OmniTypeKind.STRING, nullable: true},
      {kind: OmniTypeKind.STRING, nullable: false},
    );

    expectA(
      ctx,
      {kind: OmniTypeKind.INTEGER, nullable: true},
      {kind: OmniTypeKind.INTEGER, nullable: false},
    );
  });

  test('primitive diff', ctx => {

    let diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.STRING},
      {kind: OmniTypeKind.STRING},
      OMNI_GENERIC_FEATURES,
    );
    ctx.expect(diff).toHaveLength(0);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.STRING},
      {kind: OmniTypeKind.ARRAY, of: {kind: OmniTypeKind.DOUBLE}},
      OMNI_GENERIC_FEATURES,
    );
    ctx.expect(diff).toHaveLength(1);
    ctx.expect(diff[0]).toEqual({kind: DiffKind.TYPE, typeDiffs: [TypeDiffKind.FUNDAMENTAL_TYPE]} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.INTEGER},
      {kind: OmniTypeKind.DOUBLE},
      OMNI_GENERIC_FEATURES,
    );
    ctx.expect(diff).toHaveLength(1);
    ctx.expect(diff[0]).toEqual({kind: DiffKind.TYPE, typeDiffs: [TypeDiffKind.SIZE, TypeDiffKind.PRECISION]} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.DOUBLE},
      {kind: OmniTypeKind.INTEGER},
      OMNI_GENERIC_FEATURES,
    );
    ctx.expect(diff).toHaveLength(1);
    ctx.expect(diff[0]).toEqual({kind: DiffKind.TYPE, typeDiffs: [TypeDiffKind.SIZE, TypeDiffKind.PRECISION]} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.INTEGER},
      {kind: OmniTypeKind.LONG},
      OMNI_GENERIC_FEATURES,
    );
    ctx.expect(diff).toHaveLength(1);
    ctx.expect(diff[0]).toEqual({kind: DiffKind.TYPE, typeDiffs: [TypeDiffKind.SIZE]} satisfies Diff);
  });

  const aIntProp: OmniProperty = {kind: OmniItemKind.PROPERTY, name: 'pa', type: {kind: OmniTypeKind.INTEGER}};
  const aStringProp: OmniProperty = {kind: OmniItemKind.PROPERTY, name: 'pa', type: {kind: OmniTypeKind.STRING}};
  const bIntProp: OmniProperty = {kind: OmniItemKind.PROPERTY, name: 'pb', type: {kind: OmniTypeKind.INTEGER}};
  const bFloatProp: OmniProperty = {kind: OmniItemKind.PROPERTY, name: 'pb', type: {kind: OmniTypeKind.FLOAT}};
  const bDoubleProp: OmniProperty = {kind: OmniItemKind.PROPERTY, name: 'pb', type: {kind: OmniTypeKind.DOUBLE}};

  test('object diff', ctx => {

    let diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: []},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: []},
      OMNI_GENERIC_FEATURES,
    );
    ctx.expect(diff).toHaveLength(0);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: []},
      OMNI_GENERIC_FEATURES,
    );
    ctx.expect(diff).toHaveLength(1);
    ctx.expect(diff[0]).toEqual({kind: DiffKind.MISSING_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: []},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [aIntProp]},
      OMNI_GENERIC_FEATURES,
    );
    ctx.expect(diff).toHaveLength(1);
    ctx.expect(diff[0]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [aIntProp]},
      OMNI_GENERIC_FEATURES,
    );
    ctx.expect(diff).toHaveLength(0);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bIntProp]},
      OMNI_GENERIC_FEATURES,
    );
    ctx.expect(diff).toHaveLength(2);
    ctx.expect(diff[0]).toEqual({kind: DiffKind.MISSING_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
    ctx.expect(diff[1]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(bIntProp.name, true)} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: [bIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bFloatProp]},
      OMNI_GENERIC_FEATURES,
    );
    ctx.expect(diff).toHaveLength(1);
    ctx.expect(diff[0]).toEqual({kind: DiffKind.PROPERTY_TYPE, propertyName: OmniUtil.getPropertyName(bIntProp.name, true)} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: [bIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bDoubleProp]},
      OMNI_GENERIC_FEATURES,
    );
    ctx.expect(diff).toHaveLength(1);
    ctx.expect(diff[0]).toEqual({kind: DiffKind.PROPERTY_TYPE, propertyName: OmniUtil.getPropertyName(bIntProp.name, true)} satisfies PropertyTypeDiff);
  });

  test('unique diffs', ctx => {

    const baseline: OmniType = {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]};
    const others: OmniType[] = [
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bIntProp]},
    ];

    const uniqueDiffs = OmniUtil.getAllEncompassingDiffs(baseline, others, OMNI_GENERIC_FEATURES);

    ctx.expect(uniqueDiffs).toHaveLength(2);
    ctx.expect(uniqueDiffs[0]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
    ctx.expect(uniqueDiffs[1]).toEqual({kind: DiffKind.MISSING_PROPERTY, propertyName: OmniUtil.getPropertyName(bIntProp.name, true)} satisfies Diff);
  });

  test('unique diffs, 2 same others', ctx => {

    const baseline: OmniType = {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]};
    const others: OmniType[] = [
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'c', properties: [bDoubleProp]},
    ];

    const uniqueDiffs = OmniUtil.getAllEncompassingDiffs(baseline, others, OMNI_GENERIC_FEATURES);

    // 'pa' does not exist in any other, 'pb' exist in all other
    ctx.expect(uniqueDiffs).toHaveLength(2);
    ctx.expect(uniqueDiffs[0]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
    ctx.expect(uniqueDiffs[1]).toEqual({kind: DiffKind.MISSING_PROPERTY, propertyName: OmniUtil.getPropertyName(bIntProp.name, true)} satisfies Diff);
  });

  test('unique diffs, 2 different others', ctx => {

    const baseline: OmniType = {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]};
    const others: OmniType[] = [
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'c', properties: [aStringProp]},
    ];

    const uniqueDiffs = OmniUtil.getAllEncompassingDiffs(baseline, others, OMNI_GENERIC_FEATURES);

    // 'pa' exist in at least one other, 'pb' does not exist in all, 'pa' if it exists it is always an int
    ctx.expect(uniqueDiffs).toHaveLength(1);
    ctx.expect(uniqueDiffs[0]).toEqual({kind: DiffKind.PROPERTY_TYPE, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
  });

  test('unique diffs, different fundamental types', ctx => {

    const baseline: OmniType = {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]};
    const others: OmniType[] = [
      {kind: OmniTypeKind.NUMBER},
      {
        kind: OmniTypeKind.DICTIONARY,
        keyType: {kind: OmniTypeKind.STRING},
        valueType: {kind: OmniTypeKind.STRING},
      },
    ];

    const uniqueDiffs = OmniUtil.getAllEncompassingDiffs(baseline, others, OMNI_GENERIC_FEATURES);

    ctx.expect(uniqueDiffs).toHaveLength(2);
    ctx.expect(uniqueDiffs[0]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
    ctx.expect(uniqueDiffs[1]).toEqual({kind: DiffKind.TYPE, typeDiffs: [TypeDiffKind.FUNDAMENTAL_TYPE]} satisfies Diff);
  });

  test('unique diffs, mixed types', ctx => {

    const baseline: OmniType = {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]};
    const others: OmniType[] = [
      {kind: OmniTypeKind.NUMBER},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bIntProp]},
    ];

    const uniqueDiffs = OmniUtil.getAllEncompassingDiffs(baseline, others, OMNI_GENERIC_FEATURES);

    ctx.expect(uniqueDiffs).toHaveLength(1);
    ctx.expect(uniqueDiffs[0]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
  });

  test('literal diffs', ctx => {

    const baseline: OmniType = {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]};
    const others: OmniType[] = [
      {kind: OmniTypeKind.NUMBER},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bIntProp]},
    ];

    const uniqueDiffs = OmniUtil.getAllEncompassingDiffs(baseline, others, OMNI_GENERIC_FEATURES);

    ctx.expect(uniqueDiffs).toHaveLength(1);
    ctx.expect(uniqueDiffs[0]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
  });
});

const expectA = (ctx: TaskContext & TestContext, a: OmniPrimitiveType, b: OmniPrimitiveType): void => {
  ctx.expect(expectCommon(a, b).type).toEqual(a);
};

const expectCommon = (a: OmniPrimitiveType, b: OmniPrimitiveType, features = OMNI_GENERIC_FEATURES): CommonDenominatorType => {

  return OmniUtil.getCommonDenominatorBetween(a, b, features)
    || {type: {kind: OmniTypeKind.UNKNOWN}, diffs: [TypeDiffKind.FUNDAMENTAL_TYPE]};
};
