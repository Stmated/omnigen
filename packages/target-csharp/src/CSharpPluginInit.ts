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
  AstTransformerArguments,
  DEFAULT_PACKAGE_OPTIONS,
  DEFAULT_TARGET_OPTIONS,
  OmniModel2ndPassTransformer,
  OmniModelTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniModelTransformerArgs,
  PackageOptions,
  ParserOptions,
  TargetOptions,
  ZodAstNodeContext,
  ZodParserOptions,
} from '@omnigen/core';
import {z} from 'zod';
import {ZodCompilationUnitsContext} from '@omnigen/core-util';
import {createCSharpRenderer} from './render';
import {
  AddAbstractAccessorsAstTransformer,
  AddAdditionalPropertiesInterfaceAstTransformer,
  AddCommentsAstTransformer,
  AddCompositionMembersJavaAstTransformer,
  AddConstructorJavaAstTransformer,
  AddFieldsAstTransformer,
  AddGeneratedCommentAstTransformer,
  AddObjectDeclarationsJavaAstTransformer,
  AddSubTypeHintsAstTransformer,
  AddThrowsForKnownMethodsAstTransformer,
  DEFAULT_JAVA_OPTIONS,
  DeleteUnnecessaryCompositionsJavaModelTransformer,
  GenericNodesToSpecificJavaAstTransformer,
  InnerTypeCompressionAstTransformer, InterfaceJavaModelTransformer,
  Java,
  JavaAndTargetOptions,
  JavaOptions,
  JavaPlugins,
  PackageResolverAstTransformer,
  RemoveConstantParametersAstTransformer,
  ReorderMembersAstTransformer,
  ResolveGenericSourceIdentifiersAstTransformer,
  SerializationLibrary,
  SimplifyGenericsAstTransformer,
  SortVisitorRegistry,
  ZodJavaOptions,
} from '@omnigen/target-java';
import {CSharpOptions, ZodCSharpOptions} from './options';
import {LoggerFactory} from '@omnigen/core-log';
import {CSHARP_FEATURES} from './features';
import {Cs, CSharpRootNode} from './ast';
import {MethodToGetterTypeScriptAstTransformer, RemoveEnumFieldsTypeScriptAstTransformer} from '@omnigen/target-typescript';
import {AddPropertyAccessorForFieldAstTransformer} from './ast/AddPropertyAccessorForFieldAstTransformer.ts';
import {NamespaceWrapperAstTransformer} from './ast/NamespaceWrapperAstTransformer.ts';
import {DelegatesToCSharpAstTransformer} from './ast/DelegatesToCSharpAstTransformer.ts';
import {NonNumericEnumToConstClassAstTransformer} from './ast/NonNumericEnumToConstClassAstTransformer.ts';
import {ToCSharpModifiersAstTransformer} from './ast/ToCSharpModifiersAstTransformer.ts';

const logger = LoggerFactory.create(import.meta.url);

export type CSharpAstTransformerArgs = AstTransformerArguments<CSharpRootNode, CSharpOptions & JavaAndTargetOptions>;

export const ZodParserOptionsContext = z.object({
  parserOptions: ZodParserOptions,
});

export const ZodCSharpOptionsContext = z.object({
  csOptions: ZodCSharpOptions,
});

export const ZodCSharpTargetContext = z.object({
    target: z.literal('csharp'),
  })
  .merge(ZodTargetFeaturesContext);

export const ZodCSharpInitContextIn = ZodModelContext.extend({
  target: z.literal('csharp').or(z.undefined()),
});

export const ZodCSharpInitContextOut = ZodModelContext
  .merge(ZodCSharpOptionsContext)
  .merge(JavaPlugins.ZodJavaOptionsContext)
  .merge(ZodCSharpTargetContext);

export const ZodCSharpContextIn = ZodModelContext
  .merge(ZodParserOptionsContext)
  .merge(ZodPackageOptionsContext)
  .merge(ZodTargetOptionsContext)
  .merge(ZodModelTransformOptionsContext)
  .merge(ZodCSharpOptionsContext)
  .merge(ZodCSharpTargetContext)
  .merge(JavaPlugins.ZodJavaOptionsContext);

export const ZodCSharpContextOut = ZodCSharpContextIn
  .merge(ZodAstNodeContext);

export const CSharpPluginInit = createPlugin(
  {
    name: 'cs-init', in: ZodCSharpInitContextIn, out: ZodCSharpInitContextOut,
    action: ActionKind.RUNTIME_REFINES,
    scoreModifier: LATER_IS_BETTER,
  },
  async ctx => {

    if (ctx.target !== undefined && ctx.target != 'csharp') {
      return new z.ZodError([
        {code: 'custom', path: ['target'], message: `Target is not CSharp`},
      ]);
    }

    const csharpOptions = ZodCSharpOptions.safeParse(ctx.arguments);
    if (!csharpOptions.success) {
      return csharpOptions.error;
    }

    const javaOptions = ZodJavaOptions.safeParse(ctx.arguments);
    if (!javaOptions.success) {
      return javaOptions.error;
    }

    const order = [
      Cs.PropertyNode,
      Java.ConstructorDeclaration,
    ];

    SortVisitorRegistry.INSTANCE.register(
      (root, a, b) => {

        const aIndex = order.findIndex(it => a instanceof it);
        const bIndex = order.findIndex(it => b instanceof it);

        if (aIndex !== -1 && bIndex !== -1) {
          const result = (aIndex - bIndex);
          if (result !== 0) {
            return result;
          }
        }

        return undefined;
      },
      100,
    );

    return {
      ...ctx,
      target: 'csharp',
      csOptions: csharpOptions.data,
      javaOptions: javaOptions.data,
      targetFeatures: CSHARP_FEATURES,
    } as const;
  },
);

export const CSharpPlugin = createPlugin(
  {name: 'cs', in: ZodCSharpContextIn, out: ZodCSharpContextOut, score: PluginScoreKind.REQUIRED},
  async ctx => {

    const modelTransformerArgs: OmniModelTransformerArgs<ParserOptions> = {
      model: ctx.model,
      options: {...ctx.parserOptions, ...ctx.modelTransformOptions},
    };

    const transformers: OmniModelTransformer[] = [
      // new CompositionGenericTargetToObjectJavaModelTransformer(),
      new InterfaceJavaModelTransformer(),
      new DeleteUnnecessaryCompositionsJavaModelTransformer(),
    ];

    for (const transformer of transformers) {
      transformer.transformModel(modelTransformerArgs);
    }

    // Then do 2nd pass transforming

    type TOpt = ParserOptions & TargetOptions & JavaOptions & CSharpOptions;

    // TODO: Quite ugly, a bit confusing to override options hard-coded this way, it will override what the user told us
    const overridingJavaOptions: Partial<JavaOptions> = {
      commentsOnFields: true,
      serializationLibrary: SerializationLibrary.POJO,
    };

    const modelTransformer2Args: OmniModelTransformer2ndPassArgs<TOpt> = {
      model: ctx.model,
      options: {
        ...ctx.parserOptions,
        ...ctx.modelTransformOptions,
        ...ctx.targetOptions,
        ...ctx.javaOptions,
        ...overridingJavaOptions,
        ...ctx.csOptions,
      },
      targetFeatures: CSHARP_FEATURES,
    };

    const transformers2: OmniModel2ndPassTransformer<TOpt>[] = [
      // new StrictUndefinedTypeScriptModelTransformer(),
      // new RemoveWildcardGenericParamTypeScriptModelTransformer(),
    ] as const;

    for (const transformer of transformers2) {

      transformer.transformModel2ndPass(modelTransformer2Args);
    }

    const astNode = new CSharpRootNode([]);

    const astTransformers = [
      new AddObjectDeclarationsJavaAstTransformer(),
      new AddFieldsAstTransformer(),
      new NonNumericEnumToConstClassAstTransformer(),
      // // new AddAccessorsForFieldsAstTransformer(),
      new AddAbstractAccessorsAstTransformer(),
      new AddConstructorJavaAstTransformer(),
      new AddAdditionalPropertiesInterfaceAstTransformer(),
      new AddCommentsAstTransformer(),
      new AddSubTypeHintsAstTransformer(),
      new InnerTypeCompressionAstTransformer(),
      new AddThrowsForKnownMethodsAstTransformer(),
      new ResolveGenericSourceIdentifiersAstTransformer(),
      new SimplifyGenericsAstTransformer(),
      // new CompositionTypeScriptAstTransformer(),
      new AddCompositionMembersJavaAstTransformer(),
      new MethodToGetterTypeScriptAstTransformer(),
      // new RemoveSuperfluousGetterTypeScriptAstTransformer(),
      new RemoveConstantParametersAstTransformer(),
      // new ClassToInterfaceTypeScriptAstTransformer(),
      // new InterfaceToTypeAliasTypeScriptAstTransformer(),
      // new ToHardCodedTypeTypeScriptAstTransformer(),
      // new SingleFileTypeScriptAstTransformer(),
      new RemoveEnumFieldsTypeScriptAstTransformer(),
      new AddPropertyAccessorForFieldAstTransformer(),
      new ToCSharpModifiersAstTransformer(),
      new GenericNodesToSpecificJavaAstTransformer(),
      new DelegatesToCSharpAstTransformer(),
      new NamespaceWrapperAstTransformer(),
      new PackageResolverAstTransformer(),
      new ReorderMembersAstTransformer(),
      new AddGeneratedCommentAstTransformer(),
    ] as const;

    const options: CSharpOptions & JavaOptions & TargetOptions & PackageOptions = {
      ...ctx.targetOptions,
      ...ctx.packageOptions,
      ...ctx.javaOptions,
      ...overridingJavaOptions,
      ...ctx.csOptions,
    };

    const astTransformerArgs: CSharpAstTransformerArgs = {
      model: ctx.model,
      externals: [],
      features: CSHARP_FEATURES,
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

export const CSharpRendererCtxIn = ZodModelContext
  .merge(ZodAstNodeContext)
  .merge(ZodCSharpOptionsContext)
  .merge(ZodCSharpTargetContext);

export const CSharpRendererCtxOut = CSharpRendererCtxIn
  .merge(ZodAstNodeContext)
  .merge(ZodRenderersContext)
  .merge(ZodCompilationUnitsContext);

export const CSharpRendererPlugin = createPlugin(
  {name: 'cs-render', in: CSharpRendererCtxIn, out: CSharpRendererCtxOut, score: PluginScoreKind.IMPORTANT},
  async ctx => {

    const rootTsNode = ctx.astNode as CSharpRootNode;

    const renderer = createCSharpRenderer(rootTsNode, {
      ...DEFAULT_JAVA_OPTIONS,
      ...DEFAULT_PACKAGE_OPTIONS,
      ...DEFAULT_TARGET_OPTIONS,
      ...ctx.csOptions,
    });
    const rendered = renderer.executeRender(ctx.astNode, renderer);

    return {
      ...ctx,
      renderers: [renderer],
      compilationUnits: rendered,
    };
  },
);

logger.info(`Registering csharp plugins`);
export default PluginAutoRegistry.register([CSharpPluginInit, CSharpPlugin, CSharpRendererPlugin]);
