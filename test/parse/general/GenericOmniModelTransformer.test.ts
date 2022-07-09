import {GenericOmniModelTransformer} from '@parse/general/GenericOmniModelTransformer';
import {OmniModel, OmniPrimitiveKind, OmniTypeKind} from '@parse';
import {TestUtils} from '../../TestUtils';

describe('Test CompositionDependencyUtil', () => {

  test('ensureNothingChanges', async () => {

    const transformer = new GenericOmniModelTransformer();

    const model: OmniModel = {
      name: 'model',
      schemaType: 'other',
      schemaVersion: '1.0',
      version: '1.0',
      endpoints: [],
      servers: [],
      types: [
        TestUtils.obj('A')
      ],
    };

    transformer.transform(model);

    expect(model.types).toHaveLength(1);

    const type = model.types[0];

    expect(type.name).toEqual('A');
    if (type.kind != OmniTypeKind.OBJECT) throw new Error(`Should be an object`);

    expect(type.properties).not.toBeDefined();
  });

  test('ensureGenericsAdded', async () => {

    const transformer = new GenericOmniModelTransformer();

    const a = TestUtils.obj('A', undefined, [
      TestUtils.prop('propA', {
        name: 'propAType',
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.INTEGER
      })
    ]);

    const aa = TestUtils.obj('aa', a, [
      TestUtils.prop('propX', {
        name: 'propAType',
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.INTEGER
      })
    ]);
    const ab = TestUtils.obj('ab', a, [
      TestUtils.prop('propX', {
        name: 'propAType',
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: OmniPrimitiveKind.DOUBLE
      })
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
        ab
      ],
    };

    transformer.transform(model);

    expect(model.types).toHaveLength(3);

    expect(model.types[0].name).toEqual('A');
    if (model.types[0].kind != OmniTypeKind.GENERIC_SOURCE) throw new Error(`Should be a generic source`);
    if (model.types[1].kind != OmniTypeKind.OBJECT) throw new Error(`Should be an object`);
    if (model.types[2].kind != OmniTypeKind.OBJECT) throw new Error(`Should be an object`);

    expect(model.types[0].of).toEqual(a);

    if (model.types[1].extendedBy?.kind != OmniTypeKind.GENERIC_TARGET) throw new Error(`Wrong kind`);
    if (model.types[2].extendedBy?.kind != OmniTypeKind.GENERIC_TARGET) throw new Error(`Wrong kind`);

    expect(model.types[0].generics).toHaveLength(1);
    expect(model.types[1].extendedBy.generics).toHaveLength(1);
    expect(model.types[2].extendedBy.generics).toHaveLength(1);

    expect(model.types[1].extendedBy.source).toEqual(model.types[0]);
    expect(model.types[2].extendedBy.source).toEqual(model.types[0]);

    // if (model.types[0].generics[0].kind != OmniTypeKind.PRIMITIVE) throw new Error(`Wrong kind`);
    if (model.types[1].extendedBy.generics[0].type.kind != OmniTypeKind.PRIMITIVE) throw new Error(`Wrong kind`);
    if (model.types[2].extendedBy.generics[0].type.kind != OmniTypeKind.PRIMITIVE) throw new Error(`Wrong kind`);

    expect(model.types[1].extendedBy.generics[0].type.primitiveKind).toEqual(OmniPrimitiveKind.INTEGER);
    expect(model.types[2].extendedBy.generics[0].type.primitiveKind).toEqual(OmniPrimitiveKind.DOUBLE);

    if (!model.types[0].generics[0].lowerBound) throw new Error(`No lower bound`);
    if (model.types[0].generics[0].lowerBound.kind != OmniTypeKind.PRIMITIVE) throw new Error(`Wrong kind`);

    expect(model.types[0].generics[0].lowerBound.primitiveKind).toEqual(OmniPrimitiveKind.DOUBLE);
  });
});
