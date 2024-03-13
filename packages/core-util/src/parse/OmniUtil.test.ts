import {
  OmniPrimitiveBaseType,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniType,
  OmniTypeKind,
} from '@omnigen/core';
import {TypeDifference} from '@omnigen/core';
import {OmniUtil} from './OmniUtil';
import {CommonDenominatorType} from '@omnigen/core';
import {OMNI_GENERIC_FEATURES} from '@omnigen/core';
import {describe, test, expect} from 'vitest';

describe('OmniUtil', () => {

  test('EqualityLevel Primitives', async () => {

    expect(expectCommon(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING},
    ).diffs ?? []).toEqual([]);

    expect(expectCommon(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.DOUBLE},
    ).diffs ?? []).toEqual([TypeDifference.ISOMORPHIC_TYPE]);

    // With default features, we cannot handle the literal types
    expect(expectCommon(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, literal: true, value: 'hello'},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, literal: true, value: 'bye'},
      {...OMNI_GENERIC_FEATURES, primitiveGenerics: false, literalTypes: true},
    ).diffs).toEqual([TypeDifference.FUNDAMENTAL_TYPE]);

    // With Java, the literal types become the same type in the signature
    const literalString = expectCommon(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, literal: true, value: 'hello'},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, literal: true, value: 'bye'},
      {...OMNI_GENERIC_FEATURES, primitiveGenerics: false, literalTypes: false},
    );

    expect(literalString.diffs).toEqual([TypeDifference.NARROWED_LITERAL_TYPE]);
    expect(literalString.type.kind).toEqual(OmniTypeKind.PRIMITIVE);

    const literalPrimitiveString = (literalString.type as OmniPrimitiveBaseType);
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
});

// type PrimitiveOrWrapped = OmniPrimitiveType | OmniWrappedType<OmniPrimitiveType>;

const expectA = (a: OmniPrimitiveType, b: OmniPrimitiveType): void => {
  expect(expectCommon(a, b).type).toEqual(a);
};

const expectB = (a: OmniPrimitiveType, b: OmniPrimitiveType): void => {
  expect(expectCommon(a, b).type).toEqual(b);
};

const expectNone = (a: OmniPrimitiveType, b: OmniPrimitiveType): void => {
  expect(OmniUtil.getCommonDenominatorBetween(a, b, OMNI_GENERIC_FEATURES)).toBeUndefined();
};

const expectCommon = (a: OmniPrimitiveType, b: OmniPrimitiveType, features = OMNI_GENERIC_FEATURES): CommonDenominatorType<OmniType> => {

  return OmniUtil.getCommonDenominatorBetween(a, b, features)
    || {type: {kind: OmniTypeKind.UNKNOWN}, diffs: [TypeDifference.FUNDAMENTAL_TYPE]};
};
