import {
  OmniPrimitiveBaseType,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniPrimitiveValueMode,
  OmniType,
  OmniTypeKind,
  OmniWrappedType,
} from './OmniModel.js';
import {TypeDifference} from '../equality/index.js';
import {OmniUtil} from './OmniUtil.js';
import {CommonDenominatorType} from './CommonDenominatorType.js';
import {OMNI_GENERIC_FEATURES} from '../interpret/index.js';
import {JAVA_FEATURES} from '@omnigen/target-java';

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
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, valueMode: OmniPrimitiveValueMode.LITERAL, value: 'hello'},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, valueMode: OmniPrimitiveValueMode.LITERAL, value: 'bye'},
    ).diffs).toEqual([TypeDifference.FUNDAMENTAL_TYPE]);

    // With Java, the literal types become the same type in the signature
    const literalString = expectCommon(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, valueMode: OmniPrimitiveValueMode.LITERAL, value: 'hello'},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, valueMode: OmniPrimitiveValueMode.LITERAL, value: 'bye'},
      JAVA_FEATURES,
    );

    expect(literalString.diffs).toEqual([TypeDifference.NARROWED_LITERAL_TYPE]);
    expect(literalString.type.kind).toEqual(OmniTypeKind.PRIMITIVE);

    const literalPrimitiveString = (literalString.type as OmniPrimitiveBaseType);
    expect(literalPrimitiveString.primitiveKind).toEqual(OmniPrimitiveKind.STRING);
    expect(literalPrimitiveString.value).toBeUndefined();
    expect(literalPrimitiveString.valueMode).toBeUndefined();

    expectA(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, nullable: true},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.STRING, nullable: false},
    );

    expectA(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER, nullable: true},
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER, nullable: false},
    );

    // TODO: Lots and lots of comparisons with box modes and value modes and values and nullable!
    //           Need to create a complete grid where we test ALL combinations and get the EXACT expected result

    expectA(
      {
        kind: OmniTypeKind.WRAPPED,
        of: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER, nullable: true},
        nullable: false,
      },
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER, nullable: false},
    );

    expectB(
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER, nullable: false},
      {
        kind: OmniTypeKind.WRAPPED,
        of: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER, nullable: true},
        nullable: false,
      },
    );

    // The nullability goes in the wrong direction where it is not covariant
    expectNone(
      {
        kind: OmniTypeKind.WRAPPED,
        of: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER, nullable: true},
        nullable: false,
      },
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.DOUBLE, nullable: false},
    );

    // The nullability goes in the right direction here
    const res = expectCommon(
      {
        kind: OmniTypeKind.WRAPPED,
        of: {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.INTEGER, nullable: false},
        nullable: false,
      },
      {kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.DOUBLE, nullable: true},
    );
    expect(res.type.kind).toEqual(OmniTypeKind.WRAPPED);
  });
});

type PrimitiveOrWrapped = OmniPrimitiveType | OmniWrappedType<OmniPrimitiveType>;

const expectA = (a: PrimitiveOrWrapped, b: PrimitiveOrWrapped): void => {
  expect(expectCommon(a, b).type).toEqual(a);
};

const expectB = (a: PrimitiveOrWrapped, b: PrimitiveOrWrapped): void => {
  expect(expectCommon(a, b).type).toEqual(b);
};

const expectNone = (a: PrimitiveOrWrapped, b: PrimitiveOrWrapped): void => {
  expect(OmniUtil.getCommonDenominatorBetween(a, b, OMNI_GENERIC_FEATURES)).toBeUndefined();
};

const expectCommon = (a: PrimitiveOrWrapped, b: PrimitiveOrWrapped, features = OMNI_GENERIC_FEATURES): CommonDenominatorType<OmniType> => {

  return OmniUtil.getCommonDenominatorBetween(a, b, features)
    || {type: {kind: OmniTypeKind.UNKNOWN}, diffs: [TypeDifference.FUNDAMENTAL_TYPE]};
};
