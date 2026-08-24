import {CommonDenominatorType, OMNI_GENERIC_FEATURES, OmniGenericSourceIdentifierType, OmniGenericSourceType, OmniGenericTargetType, OmniItemKind, OmniObjectType, OmniPrimitiveType, OmniProperty, OmniType, OmniTypeKind, TargetFeatures, TypeDiffKind} from '@omnigen/api';
import {Diff, DiffKind, OmniUtil, PropertyTypeDiff} from './OmniUtil';
import {TypeInvestigator} from './TypeInvestigator';
import {describe, test, TestContext} from 'vitest';
import {CombineOptions, CreateMode} from '../util';
import {PropertyUtil} from './PropertyUtil';

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

  test('Common denominator is accumulated across all types', ctx => {

    const common = TypeInvestigator.getCommonDenominator(OMNI_GENERIC_FEATURES, [
      {kind: OmniTypeKind.INTEGER_SMALL},
      {kind: OmniTypeKind.INTEGER},
      {kind: OmniTypeKind.DOUBLE},
    ]);

    ctx.expect(common?.type.kind).toEqual(OmniTypeKind.DOUBLE);
    ctx.expect(common?.diffs).toEqual([TypeDiffKind.SIZE]);
  });

  test('Common denominator retains nullable generic bounds over polymorphic literals in every order', ctx => {

    const sourceIdentifier: OmniGenericSourceIdentifierType = {
      kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
      placeholderName: 'T',
    };
    const source: OmniGenericSourceType = {
      kind: OmniTypeKind.GENERIC_SOURCE,
      of: {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: [], edgeName: 'Box'}},
      sourceIdentifiers: [sourceIdentifier],
    };
    const box = (type: OmniType): OmniGenericTargetType => ({
      kind: OmniTypeKind.GENERIC_TARGET,
      source,
      targetIdentifiers: [{
        kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
        sourceIdentifier,
        type,
      }],
    });
    const types = [
      box({kind: OmniTypeKind.NULL}),
      box({kind: OmniTypeKind.NULL}),
      box({kind: OmniTypeKind.INTEGER, literal: true, value: 1}),
      box({kind: OmniTypeKind.INTEGER, literal: true, value: 2}),
    ];

    for (const [permutationIndex, permutation] of [...permutations(types)].entries()) {
      const common = PropertyUtil.getCommonProperties(
        () => false,
        () => false,
        OMNI_GENERIC_FEATURES,
        {create: CreateMode.SIMPLE},
        ...permutation.map((type, index): OmniObjectType => ({
          kind: OmniTypeKind.OBJECT,
          name: `Owner${index}`,
          properties: [{kind: OmniItemKind.PROPERTY, name: 'value', type}],
        })),
      );

      const commonType = common.byPropertyName.value.commonType as OmniGenericTargetType;
      ctx.expect(commonType.targetIdentifiers[0].type, `permutation ${permutationIndex}`).toMatchObject({
        kind: OmniTypeKind.INTEGER,
        nullable: true,
      });
      ctx.expect(commonType.targetIdentifiers[0].type).not.toHaveProperty('literal');
      ctx.expect(commonType.targetIdentifiers[0].type).not.toHaveProperty('value');
    }
  });

  test('EqualityLevel Polymorphic Strings', async ctx => {

    // With Java, the literal types become the same type in the signature
    const literalString = expectCommon(
      {kind: OmniTypeKind.STRING, literal: true, value: 'hello'},
      {kind: OmniTypeKind.STRING, literal: true, value: 'bye'},
      {...OMNI_GENERIC_FEATURES, primitiveGenerics: false, literalTypes: false},
      {create: CreateMode.DOWNGRADE}
    );

    // The diff itself is still a `POLYMORPHIC_LITERAL`, even though for the target the types are fundamentally incompatible.
    // But it is up to the caller to decide what the diff means in its context.
    ctx.expect(literalString.diffs).toEqual([TypeDiffKind.POLYMORPHIC_LITERAL]);
    ctx.expect(OmniUtil.isPrimitive(literalString.type)).toEqual(true);

    const literalPrimitiveString = (literalString.type as OmniPrimitiveType);
    ctx.expect(literalPrimitiveString.kind).toEqual(OmniTypeKind.STRING);
    ctx.expect(literalPrimitiveString.value).toBeUndefined();
    ctx.expect(literalPrimitiveString.literal).toBeUndefined();
  });

  test('EqualityLevel Polymorphic Strings Without Creation', async ctx => {

    // With Java, the literal types become the same type in the signature
    const literalString = expectCommon(
      {kind: OmniTypeKind.STRING, literal: true, value: 'hello'},
      {kind: OmniTypeKind.STRING, literal: true, value: 'bye'},
      {...OMNI_GENERIC_FEATURES, primitiveGenerics: false, literalTypes: false},
      {create: CreateMode.NONE}
    );

    ctx.expect(literalString.diffs).toEqual([TypeDiffKind.FUNDAMENTAL_TYPE]);
  });

  test('EqualityLevel Polymorphic Literal', async ctx => {

    const features: TargetFeatures = {...OMNI_GENERIC_FEATURES, primitiveGenerics: false, literalTypes: true};

    // With default features, we cannot handle the literal types
    ctx.expect(expectCommon(
      {kind: OmniTypeKind.STRING, literal: true, value: 'hello'},
      {kind: OmniTypeKind.STRING, literal: true, value: 'bye'},
      features,
    ).diffs).toEqual([TypeDiffKind.FUNDAMENTAL_TYPE]);

    ctx.expect(expectCommon(
      {kind: OmniTypeKind.STRING, literal: true, value: 'hello'},
      {kind: OmniTypeKind.STRING, literal: true, value: 'bye'},
      features,
      {create: CreateMode.DOWNGRADE}
    ).diffs).toEqual([TypeDiffKind.POLYMORPHIC_LITERAL]);
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

const expectA = (ctx: TestContext, a: OmniPrimitiveType, b: OmniPrimitiveType): void => {
  ctx.expect(expectCommon(a, b).type).toEqual(a);
};

const expectCommon = (a: OmniPrimitiveType, b: OmniPrimitiveType, features = OMNI_GENERIC_FEATURES, opt?: CombineOptions): CommonDenominatorType => {

  return TypeInvestigator.getCommonDenominatorBetween(a, b, features, opt)
    || {type: {kind: OmniTypeKind.UNKNOWN}, diffs: [TypeDiffKind.FUNDAMENTAL_TYPE]};
};

function* permutations<T>(items: ReadonlyArray<T>): Generator<T[]> {

  if (items.length <= 1) {
    yield [...items];
    return;
  }

  for (let i = 0; i < items.length; i++) {
    for (const remainder of permutations([...items.slice(0, i), ...items.slice(i + 1)])) {
      yield [items[i], ...remainder];
    }
  }
}
