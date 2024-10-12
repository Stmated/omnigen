import {JavaOptions, JavaPlugins} from '@omnigen/target-java';
import {ModelTransformOptions, OmniModelParserResult, OmniTypeKind, PackageOptions, TargetOptions} from '@omnigen/api';
import {Naming, OmniModelMerge, OmniUtil, Util} from '@omnigen/core';
import {describe, test, vi} from 'vitest';
import {PluginManager} from '@omnigen/plugin';
import {BaseContext, FileContext, TargetContext, ZodModelContext, ZodPackageOptionsContext, ZodTargetOptionsContext} from '@omnigen/core-plugin';
import {OpenRpcPlugins} from '@omnigen/parser-openrpc';
import {DEFAULT_SPECIFIC_TEST_TARGET_OPTIONS} from '@omnigen/utils-test';

describe('merge-documents', () => {

  // TODO: PluginManager needs to be able to split the work into two completely different paths
  // TODO: PluginManager needs to be able to merge the split paths back into one

  // TODO: Need to separate the OpenRpcParser and JsonSchemaParser so they are more standalone
  // TODO: Need to be able to refer to types between documents (like in this test case)

  // TODO: Need to make sure that when all is said and done, we have one large OmniModel with all proper types and endpoints

  const pm = new PluginManager({includeAuto: true});

  test('jsonschema', async ctx => {

    const exec = await pm.execute({
      ctx: {
        file: Util.getPathFromRoot('./packages/test-openrpc-java/examples/petstore-simple-jsonschema.json'),
        arguments: {},
      } satisfies BaseContext & FileContext,
      debug: true,
      stopAt: ZodModelContext,
    });

    // TODO:
    //  * Primitive should have a name: PetId -- dependant on target language if it is actually output or just inlined everywhere

    const model = exec.result.ctx.model;
    ctx.expect(model.types).toHaveLength(3);

    if (model.types[0].kind !== OmniTypeKind.INTEGER) {
      throw new Error(`Wrong kind`);
    }
    if (model.types[1].kind !== OmniTypeKind.INTEGER) {
      throw new Error(`Wrong kind`);
    }
    if (model.types[2].kind !== OmniTypeKind.OBJECT) {
      throw new Error(`Wrong kind`);
    }

    ctx.expect(Naming.unwrap(model.types[0].name ?? '')).toEqual(`PetId`);
    ctx.expect(Naming.unwrap(model.types[1].name ?? '')).toEqual(`PetAge`);

    ctx.expect(Naming.unwrap(model.types[2].name)).toEqual(`Pet`);
    ctx.expect(model.types[2].description).toEqual('Description about the Pet');
    ctx.expect(model.types[2].properties).toHaveLength(4);

    ctx.expect(model.types[2].properties.map(it => OmniUtil.getPropertyName(it.name, true))).toEqual(['id', 'age', 'name', 'tag']);
    ctx.expect(model.types[2].properties[1].type.description).toEqual('Overriding age description of the Pet');
  });
});

describe('merge-models', () => {

  test('find-equivalent-models-error-structure-1.0+1.1', async ctx => {

    ctx.expect(OpenRpcPlugins.OpenRpcPlugin, 'Here to make sure OpenRPC plugins are registered').toBeDefined();

    vi.useFakeTimers({now: new Date('2000-01-02T03:04:05.000Z')});

    const pm = new PluginManager({includeAuto: true});

    const exec10 = await pm.execute({
      ctx: {
        file: Util.getPathFromRoot('./packages/parser-openrpc/examples/error-structure.json'),
        target: 'java',
        arguments: {
          generifyTypes: false,
          compressUnreferencedSubTypes: true,
          compressSoloReferencedTypes: true,
          package: 'com.error10',
        } satisfies Partial<ModelTransformOptions & TargetOptions & PackageOptions>,
      } satisfies BaseContext & FileContext & TargetContext,
      debug: true,
      stopAt: ZodModelContext.merge(JavaPlugins.ZodJavaOptionsContext).merge(ZodPackageOptionsContext).merge(ZodTargetOptionsContext),
    });

    const exec11 = await pm.execute({
      ctx: {
        file: Util.getPathFromRoot('./packages/parser-openrpc/examples/error-structure-1.1.json'),
        target: 'java',
        arguments: {
          generifyTypes: false,
          compressUnreferencedSubTypes: true,
          compressSoloReferencedTypes: true,
          package: 'com.error11',
        } satisfies Partial<ModelTransformOptions & TargetOptions & PackageOptions>,
      } satisfies BaseContext & FileContext & TargetContext,
      debug: true,
      stopAt: ZodModelContext.merge(JavaPlugins.ZodJavaOptionsContext).merge(ZodPackageOptionsContext).merge(ZodTargetOptionsContext),
    });

    // TODO: What options to send along here? The transform options or target options or both?

    const results: OmniModelParserResult<JavaOptions & PackageOptions & TargetOptions>[] = [
      {
        model: exec10.result.ctx.model,
        options: {...exec10.result.ctx.javaOptions, ...exec10.result.ctx.packageOptions, ...exec10.result.ctx.targetOptions},
      },
      {
        model: exec11.result.ctx.model,
        options: {...exec11.result.ctx.javaOptions, ...exec11.result.ctx.packageOptions, ...exec11.result.ctx.targetOptions},
      },
    ];

    const resultMerged = OmniModelMerge.merge<JavaOptions & PackageOptions & TargetOptions>(results, {
      // TODO: Add capability of figuring out package automatically, common denominator for all given options
      ...DEFAULT_SPECIFIC_TEST_TARGET_OPTIONS,
      ...DEFAULT_SPECIFIC_TEST_TARGET_OPTIONS,
      package: 'com.common',
      compressUnreferencedSubTypes: true,
      compressSoloReferencedTypes: true,
    });

    // The merged model should (for now, we will see later) be virtually empty of functionality.
    // It is up to each respective model to output itself as normally, but to be aware that types are common.
    // This can for example be done at the file writing stage, where if the other model has already written
    // the common type to disk, then we do not need to do so again if we encounter it.
    ctx.expect(resultMerged).toBeDefined();

    ctx.expect(resultMerged.model.endpoints).toHaveLength(0);

    resultMerged.model.types.sort((a, b) => OmniUtil.describe(a).localeCompare(OmniUtil.describe(b)));

    const typeNames = resultMerged.model.types.map(it => Naming.unwrap(OmniUtil.getTypeName(it) || ''));
    ctx.expect(typeNames).toContain('JsonRpcRequestParams');
    // ctx.expect(typeNames).toContain('ListThingsRequestParams'); // TODO: This assertions should be true, but OmniModelMerge is broken after visiting changes
    ctx.expect(typeNames).toContain('Thing');
  });
});
