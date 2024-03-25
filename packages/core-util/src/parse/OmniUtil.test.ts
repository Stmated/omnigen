import {CommonDenominatorType, OMNI_GENERIC_FEATURES, OmniPrimitiveKind, OmniPrimitiveType, OmniProperty, OmniType, OmniTypeKind, TypeDiffKind} from '@omnigen/core';
import {Diff, DiffKind, OmniUtil, PropertyTypeDiff} from './OmniUtil';
import {describe, expect, test} from 'vitest';

describe('OmniUtil', () => {

  test('EqualityLevel Primitives', async () => {

    expect(expectCommon(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
    ).diffs ?? []).toEqual([]);

    expect(expectCommon(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.DOUBLE},
    ).diffs ?? []).toEqual([TypeDiffKind.SIZE, TypeDiffKind.PRECISION]);

    // With default features, we cannot handle the literal types
    expect(expectCommon(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, literal: true, value: 'hello'},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, literal: true, value: 'bye'},
      {...OMNI_GENERIC_FEATURES, primitiveGenerics: false, literalTypes: true},
    ).diffs).toEqual([TypeDiffKind.FUNDAMENTAL_TYPE]);

    // With Java, the literal types become the same type in the signature
    const literalString = expectCommon(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, literal: true, value: 'hello'},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, literal: true, value: 'bye'},
      {...OMNI_GENERIC_FEATURES, primitiveGenerics: false, literalTypes: false},
    );

    expect(literalString.diffs).toEqual([TypeDiffKind.NARROWED_LITERAL_TYPE]);
    expect(literalString.type.kind).toEqual(OmniTypeKind.PRIMITIVE);

    const literalPrimitiveString = (literalString.type as OmniPrimitiveType);
    expect(literalPrimitiveString.primitiveKind).toEqual(OmniPrimitiveKind.STRING);
    expect(literalPrimitiveString.value).toBeUndefined();
    expect(literalPrimitiveString.literal).toBeUndefined();

    expectA(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, nullable: true},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, nullable: false},
    );

    expectA(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER, nullable: true},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER, nullable: false},
    );
  });

  test('primitive diff', () => {

    let diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
      OMNI_GENERIC_FEATURES,
    );
    expect(diff).toHaveLength(0);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
      {kind: OmniTypeKind.ARRAY, of: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.DOUBLE}},
      OMNI_GENERIC_FEATURES,
    );
    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual({kind: DiffKind.TYPE, typeDiffs: [TypeDiffKind.FUNDAMENTAL_TYPE]} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.DOUBLE},
      OMNI_GENERIC_FEATURES,
    );
    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual({kind: DiffKind.TYPE, typeDiffs: [TypeDiffKind.SIZE, TypeDiffKind.PRECISION]} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.DOUBLE},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER},
      OMNI_GENERIC_FEATURES,
    );
    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual({kind: DiffKind.TYPE, typeDiffs: [TypeDiffKind.SIZE, TypeDiffKind.PRECISION]} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.LONG},
      OMNI_GENERIC_FEATURES,
    );
    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual({kind: DiffKind.TYPE, typeDiffs: [TypeDiffKind.SIZE]} satisfies Diff);
  });

  const aIntProp: OmniProperty = {name: 'pa', owner: undefined as any, type: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER}};
  const aStringProp: OmniProperty = {name: 'pa', owner: undefined as any, type: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING}};
  const bIntProp: OmniProperty = {name: 'pb', owner: undefined as any, type: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER}};
  const bFloatProp: OmniProperty = {name: 'pb', owner: undefined as any, type: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.FLOAT}};
  const bDoubleProp: OmniProperty = {name: 'pb', owner: undefined as any, type: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.DOUBLE}};

  test('object diff', () => {

    let diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: []},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: []},
      OMNI_GENERIC_FEATURES,
    );
    expect(diff).toHaveLength(0);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: []},
      OMNI_GENERIC_FEATURES,
    );
    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual({kind: DiffKind.MISSING_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: []},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [aIntProp]},
      OMNI_GENERIC_FEATURES,
    );
    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [aIntProp]},
      OMNI_GENERIC_FEATURES,
    );
    expect(diff).toHaveLength(0);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bIntProp]},
      OMNI_GENERIC_FEATURES,
    );
    expect(diff).toHaveLength(2);
    expect(diff[0]).toEqual({kind: DiffKind.MISSING_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
    expect(diff[1]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(bIntProp.name, true)} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: [bIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bFloatProp]},
      OMNI_GENERIC_FEATURES,
    );
    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual({kind: DiffKind.PROPERTY_TYPE, propertyName: OmniUtil.getPropertyName(bIntProp.name, true)} satisfies Diff);

    diff = OmniUtil.getDiff(
      {kind: OmniTypeKind.OBJECT, name: 'a', properties: [bIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bDoubleProp]},
      OMNI_GENERIC_FEATURES,
    );
    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual({kind: DiffKind.PROPERTY_TYPE, propertyName: OmniUtil.getPropertyName(bIntProp.name, true)} satisfies PropertyTypeDiff);
  });

  test('unique diffs', () => {

    const baseline: OmniType = {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]};
    const others: OmniType[] = [
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bIntProp]},
    ];

    const uniqueDiffs = OmniUtil.getAllEncompassingDiffs(baseline, others, OMNI_GENERIC_FEATURES);

    expect(uniqueDiffs).toHaveLength(2);
    expect(uniqueDiffs[0]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
    expect(uniqueDiffs[1]).toEqual({kind: DiffKind.MISSING_PROPERTY, propertyName: OmniUtil.getPropertyName(bIntProp.name, true)} satisfies Diff);
  });

  test('unique diffs, 2 same others', () => {

    const baseline: OmniType = {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]};
    const others: OmniType[] = [
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'c', properties: [bDoubleProp]},
    ];

    const uniqueDiffs = OmniUtil.getAllEncompassingDiffs(baseline, others, OMNI_GENERIC_FEATURES);

    // 'pa' does not exist in any other, 'pb' exist in all other
    expect(uniqueDiffs).toHaveLength(2);
    expect(uniqueDiffs[0]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
    expect(uniqueDiffs[1]).toEqual({kind: DiffKind.MISSING_PROPERTY, propertyName: OmniUtil.getPropertyName(bIntProp.name, true)} satisfies Diff);
  });

  test('unique diffs, 2 different others', () => {

    const baseline: OmniType = {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]};
    const others: OmniType[] = [
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bIntProp]},
      {kind: OmniTypeKind.OBJECT, name: 'c', properties: [aStringProp]},
    ];

    const uniqueDiffs = OmniUtil.getAllEncompassingDiffs(baseline, others, OMNI_GENERIC_FEATURES);

    // 'pa' exist in at least one other, 'pb' does not exist in all, 'pa' if it exists it is always an int
    expect(uniqueDiffs).toHaveLength(1);
    expect(uniqueDiffs[0]).toEqual({kind: DiffKind.PROPERTY_TYPE, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
  });

  test('unique diffs, different fundamental types', () => {

    const baseline: OmniType = {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]};
    const others: OmniType[] = [
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER},
      {
        kind: OmniTypeKind.DICTIONARY,
        keyType: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
        valueType: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
      },
    ];

    const uniqueDiffs = OmniUtil.getAllEncompassingDiffs(baseline, others, OMNI_GENERIC_FEATURES);

    expect(uniqueDiffs).toHaveLength(2);
    expect(uniqueDiffs[0]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
    expect(uniqueDiffs[1]).toEqual({kind: DiffKind.TYPE, typeDiffs: [TypeDiffKind.FUNDAMENTAL_TYPE]} satisfies Diff);
  });

  test('unique diffs, mixed types', () => {

    const baseline: OmniType = {kind: OmniTypeKind.OBJECT, name: 'a', properties: [aIntProp]};
    const others: OmniType[] = [
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.NUMBER},
      {kind: OmniTypeKind.OBJECT, name: 'b', properties: [bIntProp]},
    ];

    const uniqueDiffs = OmniUtil.getAllEncompassingDiffs(baseline, others, OMNI_GENERIC_FEATURES);

    expect(uniqueDiffs).toHaveLength(1);
    expect(uniqueDiffs[0]).toEqual({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(aIntProp.name, true)} satisfies Diff);
  });
});

const expectA = (a: OmniPrimitiveType, b: OmniPrimitiveType): void => {
  expect(expectCommon(a, b).type).toEqual(a);
};

const expectCommon = (a: OmniPrimitiveType, b: OmniPrimitiveType, features = OMNI_GENERIC_FEATURES): CommonDenominatorType<OmniType> => {

  return OmniUtil.getCommonDenominatorBetween(a, b, features)
    || {type: {kind: OmniTypeKind.UNKNOWN}, diffs: [TypeDiffKind.FUNDAMENTAL_TYPE]};
};
