import {describe, test} from 'vitest';
import {
  DEFAULT_MODEL_TRANSFORM_OPTIONS,
  DEFAULT_PARSER_OPTIONS,
  DEFAULT_TARGET_OPTIONS,
  OMNI_RESTRICTIVE_GENERIC_FEATURES,
  OmniItemKind,
  OmniModel,
  OmniModelTransformer2ndPassArgs,
  OmniObjectType,
  OmniPrimitiveType,
  OmniTypeKind,
} from '@omnigen/api';
import {SimplifyInheritanceModelTransformer} from './SimplifyInheritanceModelTransformer';
import {expectTs} from '../../util';

describe('SimplifyInheritanceModelTransformer', async () => {

  test('object-extending-primitive', async ctx => {

    const primitive: OmniPrimitiveType = {
      kind: OmniTypeKind.NUMBER,
      description: 'Some description',
    };

    const obj: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: 'SomeObject',
      properties: [],
      extendedBy: primitive,
    };

    const model: OmniModel = {
      kind: OmniItemKind.MODEL,
      schemaType: 'other',
      endpoints: [],
      types: [obj],
    };

    const transformer = new SimplifyInheritanceModelTransformer();

    const args: OmniModelTransformer2ndPassArgs = {
      model: model,
      features: OMNI_RESTRICTIVE_GENERIC_FEATURES,
      options: {...DEFAULT_PARSER_OPTIONS, ...DEFAULT_TARGET_OPTIONS, ...DEFAULT_MODEL_TRANSFORM_OPTIONS},
    };

    transformer.transformModel2ndPass(args);

    const transformedModel = args.model;

    ctx.expect(transformedModel).not.toBe(model);
    expectTs.toBeDefined(transformedModel);
    ctx.expect(transformedModel.types[0].kind).toEqual(OmniTypeKind.NUMBER);
  });
});
