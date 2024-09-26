import {assert, test} from 'vitest';
import {MergeLargeUnionLateModelTransformer} from './MergeLargeUnionLateModelTransformer.ts';
import {
  DEFAULT_MODEL_TRANSFORM_OPTIONS,
  DEFAULT_PARSER_OPTIONS,
  DEFAULT_TARGET_OPTIONS,
  OMNI_GENERIC_FEATURES,
  OmniItemKind,
  OmniModel,
  OmniModelTransformer2ndPassArgs,
  OmniObjectType,
  OmniTypeKind,
  OmniUnionType,
  TargetFeatures,
} from '@omnigen/api';
import {GenericsModelTransformer, Naming, PropertyUtil} from '@omnigen/core';

test.concurrent('Test Merge', ctx => {

  const superType: OmniObjectType = {kind: OmniTypeKind.OBJECT, name: 'Super', properties: []};

  const a: OmniObjectType = {kind: OmniTypeKind.OBJECT, name: 'A', properties: [], extendedBy: superType};
  const b: OmniObjectType = {kind: OmniTypeKind.OBJECT, name: 'B', properties: [], extendedBy: superType};
  const c: OmniObjectType = {kind: OmniTypeKind.OBJECT, name: 'C', properties: [], extendedBy: superType};

  const ax: OmniObjectType = {kind: OmniTypeKind.OBJECT, name: 'AX', properties: []};
  const bx: OmniObjectType = {kind: OmniTypeKind.OBJECT, name: 'BX', properties: []};
  const cx: OmniObjectType = {kind: OmniTypeKind.OBJECT, name: 'CX', properties: []};

  PropertyUtil.addProperty(ax, {name: 'someString', type: {kind: OmniTypeKind.STRING}});
  PropertyUtil.addProperty(bx, {name: 'someNumber', type: {kind: OmniTypeKind.NUMBER}});
  PropertyUtil.addProperty(cx, {name: 'someBoolean', type: {kind: OmniTypeKind.BOOL}});

  PropertyUtil.addProperty(a, {name: 'x', type: ax});
  PropertyUtil.addProperty(b, {name: 'x', type: bx});
  PropertyUtil.addProperty(c, {name: 'x', type: cx});

  const union: OmniUnionType = {kind: OmniTypeKind.UNION, name: 'Union', types: [a, b, c]};

  const model: OmniModel = {
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    endpoints: [],
    types: [superType, a, b, c, union],
  };

  const options = {...DEFAULT_PARSER_OPTIONS, ...DEFAULT_MODEL_TRANSFORM_OPTIONS, ...DEFAULT_TARGET_OPTIONS};

  const transformers = [
    new GenericsModelTransformer(),
  ] as const;

  const args: OmniModelTransformer2ndPassArgs = {model, options, features: OMNI_GENERIC_FEATURES};
  for (const transformer of transformers) {
    transformer.transformModel2ndPass(args);
  }

  const transformers2 = [
    new GenericsModelTransformer(),
    new MergeLargeUnionLateModelTransformer(),
  ] as const;

  const features: TargetFeatures = {...OMNI_GENERIC_FEATURES, unions: false};

  const args2: OmniModelTransformer2ndPassArgs = {model: args.model, options, features: features};
  for (const transformer of transformers2) {
    transformer.transformModel2ndPass(args2);
  }

  assert.isTrue(a.extendedBy?.kind === OmniTypeKind.GENERIC_TARGET);
  assert.isTrue(b.extendedBy?.kind === OmniTypeKind.GENERIC_TARGET);
  assert.isTrue(c.extendedBy?.kind === OmniTypeKind.GENERIC_TARGET);

  assert.equal(args2.model.types.length, 5);
  assert.equal(union.types.length, 3);

  assert.equal(union.kind, OmniTypeKind.UNION);

  const modelUnion = args2.model.types.find(it => it.kind === OmniTypeKind.OBJECT && Naming.unwrap(it.name) === 'Union')!;
  assert.isDefined(modelUnion);

  // TODO: More validations, that make sure that the structure is what we expect -- ie. A, B, C not changed, but the union type has been changed
});
