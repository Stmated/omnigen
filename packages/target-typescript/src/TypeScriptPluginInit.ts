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
import * as Ts from './ast';
import {
  DEFAULT_PACKAGE_OPTIONS,
  DEFAULT_TARGET_OPTIONS,
  OmniModelTransformer, OmniModelTransformer2ndPassArgs,
  OmniModelTransformerArgs,
  PackageOptions,
  ParserOptions,
  TargetOptions,
  ZodAstNodeContext,
  ZodParserOptions,
} from '@omnigen/core';
import {z} from 'zod';
import {ZodCompilationUnitsContext} from '@omnigen/core-util';
import {createTypeScriptRenderer} from './render';
import {
  AddAbstractAccessorsAstTransformer,
  AddAccessorsForFieldsAstTransformer,
  AddAdditionalPropertiesInterfaceAstTransformer,
  AddCommentsAstTransformer,
  AddConstructorJavaAstTransformer,
  AddFieldsAstTransformer,
  AddGeneratedCommentAstTransformer,
  AddJakartaValidationAstTransformer,
  AddObjectDeclarationsJavaAstTransformer,
  AddSubTypeHintsAstTransformer,
  AddThrowsForKnownMethodsAstTransformer,
  DEFAULT_JAVA_OPTIONS,
  InnerTypeCompressionAstTransformer,
  JavaOptions,
  PackageResolverAstTransformer,
  ReorderMembersTransformer,
  SimplifyGenericsAstTransformer,
  ZodJavaOptions,
  JavaPlugins,
} from '@omnigen/target-java';
import {TypeScriptOptions, ZodTypeScriptOptions} from './options';
import {TYPESCRIPT_FEATURES} from './features';
import {CompositionTypeScriptAstTransformer} from './ast/CompositionTypeScriptAstTransformer.ts';
import {TypeScriptAstTransformerArgs} from './ast/TypeScriptAstVisitor.ts';
import {MethodToGetterTypeScriptAstTransformer} from './ast/MethodToGetterTypeScriptAstTransformer.ts';
import {ClassToInterfaceTypeScriptAstTransformer} from './ast/ClassToInterfaceTypeScriptAstTransformer.ts';
import {ToHardCodedTypeTypeScriptAstTransformer} from './ast/ToHardCodedTypeTypeScriptAstTransformer.ts';
import {SingleFileTypeScriptAstTransformer} from './ast/SingleFileTypeScriptAstTransformer.ts';
import {RemoveEnumFieldsTypeScriptAstTransformer} from './ast/RemoveEnumFieldsTypeScriptAstTransformer.ts';
import {StrictUndefinedTypeScriptModelTransformer} from './parse';
import {TsRootNode} from './ast';

export const ZodParserOptionsContext = z.object({
  parserOptions: ZodParserOptions,
});

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
  .merge(JavaPlugins.ZodJavaOptionsContext)
  .merge(ZodTypeScriptTargetContext);

export const ZodTypeScriptContextIn = ZodModelContext
  .merge(ZodParserOptionsContext)
  .merge(ZodPackageOptionsContext)
  .merge(ZodTargetOptionsContext)
  .merge(ZodModelTransformOptionsContext)
  .merge(ZodTypeScriptOptionsContext)
  .merge(ZodTypeScriptTargetContext)
  .merge(JavaPlugins.ZodJavaOptionsContext);

export const ZodTypeScriptContextOut = ZodTypeScriptContextIn
  .merge(ZodAstNodeContext);

export const TypeScriptPluginInit = createPlugin(
  {
    name: 'ts-init', in: ZodTypeScriptInitContextIn, out: ZodTypeScriptInitContextOut,
    action: ActionKind.SPLITS,
    scoreModifier: LATER_IS_BETTER,
  },
  async ctx => {

    if (ctx.target !== undefined && ctx.target != 'typescript') {
      return new z.ZodError([
        {code: 'custom', path: ['target'], message: `Target is not TypeScript`},
      ]);
    }

    const typescriptOptions = ZodTypeScriptOptions.safeParse(ctx.arguments);
    if (!typescriptOptions.success) {
      return typescriptOptions.error;
    }

    const javaOptions = ZodJavaOptions.safeParse(ctx.arguments);
    if (!javaOptions.success) {
      return javaOptions.error;
    }

    return {
      ...ctx,
      target: 'typescript',
      tsOptions: typescriptOptions.data,
      javaOptions: javaOptions.data,
      targetFeatures: TYPESCRIPT_FEATURES,
    } as const;
  },
);

export const TypeScriptPlugin = createPlugin(
  {name: 'ts', in: ZodTypeScriptContextIn, out: ZodTypeScriptContextOut, score: PluginScoreKind.REQUIRED},
  async ctx => {

    const modelTransformerArgs: OmniModelTransformerArgs<ParserOptions> = {
      model: ctx.model,
      options: {...ctx.parserOptions, ...ctx.modelTransformOptions},
    };

    const transformers: OmniModelTransformer[] = [
      // new CompositionGenericTargetToObjectJavaModelTransformer(),
      // new InterfaceJavaModelTransformer(),
      // new DeleteUnnecessaryXorJavaModelTransformer(),
    ];

    for (const transformer of transformers) {
      transformer.transformModel(modelTransformerArgs);
    }

    // Then do 2nd pass transforming

    const modelTransformer2Args: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & JavaOptions & TypeScriptOptions> = {
      model: ctx.model,
      options: {...ctx.parserOptions, ...ctx.modelTransformOptions, ...ctx.targetOptions, ...ctx.javaOptions, ...ctx.tsOptions},
      targetFeatures: TYPESCRIPT_FEATURES,
    };

    const transformers2 = [
      new StrictUndefinedTypeScriptModelTransformer(),
    ] as const;

    for (const transformer of transformers2) {
      transformer.transformModel2ndPass(modelTransformer2Args);
    }

    const astNode = new Ts.TsRootNode([]);

    const astTransformers = [
      new AddObjectDeclarationsJavaAstTransformer(),
      new AddFieldsAstTransformer(),
      new AddAccessorsForFieldsAstTransformer(),
      new AddAbstractAccessorsAstTransformer(),
      new AddConstructorJavaAstTransformer(),
      new AddAdditionalPropertiesInterfaceAstTransformer(),
      new AddCommentsAstTransformer(),
      new AddJakartaValidationAstTransformer(),
      new AddSubTypeHintsAstTransformer(),
      new InnerTypeCompressionAstTransformer(),
      new AddThrowsForKnownMethodsAstTransformer(),
      new SimplifyGenericsAstTransformer(),
      new CompositionTypeScriptAstTransformer(),
      new MethodToGetterTypeScriptAstTransformer(),
      new ClassToInterfaceTypeScriptAstTransformer(),
      new ToHardCodedTypeTypeScriptAstTransformer(),
      new SingleFileTypeScriptAstTransformer(),
      new RemoveEnumFieldsTypeScriptAstTransformer(),
      new AddGeneratedCommentAstTransformer(),
      new PackageResolverAstTransformer(),
      new ReorderMembersTransformer(),
    ] as const;

    const options: TypeScriptOptions & JavaOptions & TargetOptions & PackageOptions = {
      ...ctx.javaOptions,
      ...ctx.tsOptions,
      ...ctx.targetOptions,
      ...ctx.packageOptions,
    };

    const astTransformerArgs: TypeScriptAstTransformerArgs = {
      model: ctx.model,
      externals: [],
      features: TYPESCRIPT_FEATURES,
      options: options,
      root: astNode,
    };

    for (const transformer of astTransformers) {
      transformer.transformAst(astTransformerArgs);
    }

    return {
      ...ctx,
      astNode: astTransformerArgs.root,
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

    const rootTsNode = ctx.astNode as TsRootNode;
    const renderer = createTypeScriptRenderer(rootTsNode, {
      ...DEFAULT_JAVA_OPTIONS,
      ...DEFAULT_PACKAGE_OPTIONS,
      ...DEFAULT_TARGET_OPTIONS,
      ...ctx.tsOptions,
    });
    const rendered = renderer.executeRender(ctx.astNode, renderer);

    return {
      ...ctx,
      renderers: [renderer],
      compilationUnits: rendered,
    };
  },
);

export default PluginAutoRegistry.register([TypeScriptPluginInit, TypeScriptPlugin, TypeScriptRendererPlugin]);
