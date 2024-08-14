import {
  ActionKind,
  createPlugin,
  LATER_IS_BETTER,
  PluginAutoRegistry,
  PluginScoreKind,
  ZodModelContext,
  ZodModelTransformOptionsContext,
  ZodPackageOptionsContext,
  ZodRenderersContext,
  ZodTargetFeaturesContext,
  ZodTargetOptionsContext,
} from '@omnigen/core-plugin';
import {
  ClassToInterfaceTypeScriptAstTransformer,
  CompositionTypeScriptAstTransformer,
  InterfaceToTypeAliasTypeScriptAstTransformer,
  RemoveSuperfluousGetterTypeScriptAstTransformer,
  SingleFileTypeScriptAstTransformer,
  ToTypeScriptAstTransformer,
  Ts,
} from './ast';
import {
  AstTransformer,
  DEFAULT_PACKAGE_OPTIONS,
  DEFAULT_TARGET_OPTIONS,
  OmniModelTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniModelTransformerArgs,
  PackageOptions,
  ParserOptions,
  TargetOptions,
  ZodAstNodeContext,
  ZodParserOptions,
} from '@omnigen/api';
import {z} from 'zod';
import {AlignObjectWithInterfaceModelTransformer, GenericsModelTransformer, ZodCompilationUnitsContext} from '@omnigen/core';
import {createTypeScriptRenderer} from './render';
import {
  AddAbstractAccessorsAstTransformer,
  AddAccessorsForFieldsAstTransformer,
  AddAdditionalPropertiesInterfaceAstTransformer,
  AddCommentsAstTransformer,
  AddConstructorAstTransformer,
  AddFieldsAstTransformer,
  AddGeneratedCommentAstTransformer,
  AddObjectDeclarationsCodeAstTransformer, ElevatePropertiesModelTransformer,
  InnerTypeCompressionAstTransformer,
  MethodToGetterCodeAstTransformer,
  PackageResolverAstTransformer, PrettyCodeAstTransformer,
  RemoveConstantParametersAstTransformer,
  RemoveEnumFieldsCodeAstTransformer,
  ReorderMembersAstTransformer,
  ResolveGenericSourceIdentifiersAstTransformer,
  SimplifyGenericsAstTransformer,
  SimplifyUnnecessaryCompositionsModelTransformer,
  ToConstructorBodySuperCallAstTransformer,
} from '@omnigen/target-code';
import {TypeScriptOptions, ZodTypeScriptOptions} from './options';
import {TYPESCRIPT_FEATURES} from './features';
import {TypeScriptAstTransformerArgs} from './ast/TypeScriptAstVisitor';
import {RemoveWildcardGenericParamTypeScriptModelTransformer, StrictUndefinedTypeScriptModelTransformer} from './parse';
import {LoggerFactory} from '@omnigen/core-log';
import {AccessorTypeScriptAstTransformer} from './ast/AccessorTypeScriptAstTransformer.ts';

const logger = LoggerFactory.create(import.meta.url);

// export const ZodParserOptionsContext = z.object({
//   parserOptions: ZodParserOptions,
// });

export const ZodTypeScriptOptionsContext = z.object({
  tsOptions: ZodTypeScriptOptions,
});

export const ZodTypeScriptTargetContext = z.object({
    target: z.literal('typescript'),
  })
  .merge(ZodTargetFeaturesContext);

export const ZodTypeScriptInitContextIn = ZodModelContext.extend({
  target: z.literal('typescript').or(z.undefined()),
});

export const ZodTypeScriptInitContextOut = ZodModelContext
  .merge(ZodTypeScriptOptionsContext)
  .merge(ZodTypeScriptTargetContext);

export const ZodTypeScriptContextIn = ZodModelContext
  // .merge(ZodParserOptionsContext)
  .merge(ZodPackageOptionsContext)
  // .merge(ZodTargetOptionsContext)
  .merge(ZodModelTransformOptionsContext)
  .merge(ZodTypeScriptOptionsContext)
  .merge(ZodTypeScriptTargetContext)
;

export const ZodTypeScriptContextOut = ZodTypeScriptContextIn
  .merge(ZodAstNodeContext);

export const TypeScriptPluginInit = createPlugin(
  {
    name: 'ts-init', in: ZodTypeScriptInitContextIn, out: ZodTypeScriptInitContextOut,
    action: ActionKind.RUNTIME_REFINES,
    scoreModifier: LATER_IS_BETTER,
  },
  async ctx => {

    if (ctx.target !== undefined && ctx.target != 'typescript') {
      return new z.ZodError([
        {code: 'custom', path: ['target'], message: `Target is not TypeScript`},
      ]);
    }

    const typescriptOptions = ZodTypeScriptOptions.safeParse({...ctx.defaults, ...ctx.arguments});
    if (!typescriptOptions.success) {
      return typescriptOptions.error;
    }

    return {
      ...ctx,
      target: 'typescript',
      tsOptions: typescriptOptions.data,
      targetFeatures: TYPESCRIPT_FEATURES,
    } as const;
  },
);

export const TypeScriptPlugin = createPlugin(
  {name: 'ts', in: ZodTypeScriptContextIn, out: ZodTypeScriptContextOut, score: PluginScoreKind.REQUIRED},
  async ctx => {

    const modelArgs: OmniModelTransformerArgs = {
      model: ctx.model,
      options: {...ctx.tsOptions, ...ctx.modelTransformOptions},
    };

    const transformers: OmniModelTransformer[] = [
      // new SimplifyInheritanceModelTransformer(),
      // new ElevatePropertiesModelTransformer(),
      // new GenericsModelTransformer(),
      // new InterfaceExtractorModelTransformer(),
      new ElevatePropertiesModelTransformer(),
      new SimplifyUnnecessaryCompositionsModelTransformer(),
    ];

    for (const transformer of transformers) {
      transformer.transformModel(modelArgs);
    }

    // Then do 2nd pass transforming

    const modelArgs2: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & TypeScriptOptions> = {
      model: modelArgs.model,
      options: {...ctx.modelTransformOptions, ...ctx.tsOptions},
      targetFeatures: TYPESCRIPT_FEATURES,
    };

    const transformers2 = [
      new ElevatePropertiesModelTransformer(),
      new GenericsModelTransformer(),
      new StrictUndefinedTypeScriptModelTransformer(),
      new RemoveWildcardGenericParamTypeScriptModelTransformer(),
      new AlignObjectWithInterfaceModelTransformer(),
    ] as const;

    for (const transformer of transformers2) {
      transformer.transformModel2ndPass(modelArgs2);
    }

    const astNode = new Ts.TsRootNode([]);

    const astTransformers: AstTransformer<Ts.TsRootNode, PackageOptions & TargetOptions & TypeScriptOptions>[] = [
      new AddObjectDeclarationsCodeAstTransformer(),
      new AddFieldsAstTransformer(),
      new AddAccessorsForFieldsAstTransformer(),
      new AddAbstractAccessorsAstTransformer(),
      new AddConstructorAstTransformer(),
      new ToConstructorBodySuperCallAstTransformer(),
      new AddAdditionalPropertiesInterfaceAstTransformer(),
      new AddCommentsAstTransformer(),
      // new AddSubTypeHintsAstTransformer(),
      new InnerTypeCompressionAstTransformer(),
      // new AddThrowsForKnownMethodsAstTransformer(),
      new ResolveGenericSourceIdentifiersAstTransformer(),
      new SimplifyGenericsAstTransformer(),
      new CompositionTypeScriptAstTransformer(),
      new AccessorTypeScriptAstTransformer(),
      new MethodToGetterCodeAstTransformer(),
      new RemoveSuperfluousGetterTypeScriptAstTransformer(),
      new RemoveConstantParametersAstTransformer(),
      new ClassToInterfaceTypeScriptAstTransformer(),
      new InterfaceToTypeAliasTypeScriptAstTransformer(),
      new ToTypeScriptAstTransformer(),
      new SingleFileTypeScriptAstTransformer(),
      new RemoveEnumFieldsCodeAstTransformer(),
      new PackageResolverAstTransformer(),
      new ReorderMembersAstTransformer(),
      new AddGeneratedCommentAstTransformer(),
      new PrettyCodeAstTransformer(),
    ] as const;

    const options: PackageOptions & TypeScriptOptions = {
      ...ctx.tsOptions,
      // ...ctx.targetOptions,
      ...ctx.packageOptions,
    };

    const astArgs: TypeScriptAstTransformerArgs = {
      model: modelArgs2.model,
      externals: [],
      features: TYPESCRIPT_FEATURES,
      options: options,
      root: astNode,
    };

    for (const transformer of astTransformers) {
      transformer.transformAst(astArgs);
    }

    return {
      ...ctx,
      model: astArgs.model,
      astNode: astArgs.root,
    };
  },
);

export const TypeScriptRendererCtxIn = ZodModelContext
  .merge(ZodAstNodeContext)
  .merge(ZodTypeScriptOptionsContext)
  .merge(ZodTypeScriptTargetContext);

export const TypeScriptRendererCtxOut = TypeScriptRendererCtxIn
  .merge(ZodAstNodeContext)
  .merge(ZodRenderersContext)
  .merge(ZodCompilationUnitsContext);

export const TypeScriptRendererPlugin = createPlugin(
  {name: 'ts-render', in: TypeScriptRendererCtxIn, out: TypeScriptRendererCtxOut, score: PluginScoreKind.IMPORTANT},
  async ctx => {

    const rootTsNode = ctx.astNode as Ts.TsRootNode;

    const renderer = createTypeScriptRenderer(rootTsNode, {
      // ...DEFAULT_JAVA_OPTIONS,
      ...DEFAULT_PACKAGE_OPTIONS,
      ...DEFAULT_TARGET_OPTIONS,
      ...ctx.tsOptions,
    });
    const rendered = renderer.executeRender(ctx.astNode, renderer);

    const singleFileName = ctx.tsOptions.singleFileName;
    if (rendered.length == 1 && singleFileName) {

      if (singleFileName.includes('.')) {
        rendered[0].fileName = singleFileName;
      } else {
        rendered[0].fileName = `${singleFileName}.ts`;
      }
    }

    return {
      ...ctx,
      renderers: [renderer],
      compilationUnits: rendered,
    };
  },
);

logger.info(`Registering typescript plugins`);
export default PluginAutoRegistry.register([TypeScriptPluginInit, TypeScriptPlugin, TypeScriptRendererPlugin]);
