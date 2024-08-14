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
import {CompositionGenericTargetToObjectJavaModelTransformer} from './parse';
import {
  AddGeneratedAnnotationJavaAstTransformer,
  AddJakartaValidationAstTransformer,
  AddLombokAstTransformer,
  AddSubTypeHintsAstTransformer,
  AddThrowsForKnownMethodsJavaAstTransformer,
  createJavaRenderer,
  DelegatesToJavaAstTransformer,
  FieldAccessorMode,
  GroupExampleTextsToSectionAstTransformer,
  JacksonJavaAstTransformer,
  JAVA_FEATURES,
  JavaAndTargetOptions,
  JavaAstRootNode,
  JavaOptions,
  MiscNodesToSpecificJavaAstTransformer,
  PatternPropertiesToMapJavaAstTransformer,
  SimplifyGenericsJavaAstTransformer,
  ToHardCodedTypeJavaAstTransformer,
  ZodJavaOptions,
} from '.';
import {
  AstTransformer,
  AstTransformerArguments,
  OmniModel2ndPassTransformer,
  OmniModelTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniModelTransformerArgs,
  ParserOptions,
  TargetOptions,
  ZodAstNodeContext,
  ZodParserOptions,
  ZodTargetOptions,
} from '@omnigen/api';
import {z} from 'zod';
import {AlignObjectWithInterfaceModelTransformer, GenericsModelTransformer, ZodCompilationUnitsContext} from '@omnigen/core';
import * as Java from './ast/JavaAst';
import {CodeRootAstNode} from './ast/JavaAst';
import {LoggerFactory} from '@omnigen/core-log';
import {
  AddAbstractAccessorsAstTransformer,
  AddAccessorsForFieldsAstTransformer,
  AddAdditionalPropertiesInterfaceAstTransformer,
  AddCommentsAstTransformer,
  AddCompositionMembersCodeAstTransformer,
  AddConstructorAstTransformer,
  AddFieldsAstTransformer,
  AddObjectDeclarationsCodeAstTransformer,
  AggregateIntersectionsModelTransformer,
  ElevatePropertiesModelTransformer,
  InnerTypeCompressionAstTransformer,
  InterfaceExtractorModelTransformer,
  MergeLargeUnionLateModelTransformer,
  PackageResolverAstTransformer,
  PrettyCodeAstTransformer,
  RemoveConstantParametersAstTransformer,
  ReorderMembersAstTransformer,
  ResolveGenericSourceIdentifiersAstTransformer,
  SimplifyAndCleanAstTransformer,
  SimplifyGenericsAstTransformer,
  SimplifyUnnecessaryCompositionsModelTransformer,
  ToConstructorBodySuperCallAstTransformer,
} from '@omnigen/target-code';
import {BeanValidationJavaAstTransformer, MapMemberAccessToJavaAstTransformer, SimplifyTypePathsJavaAstTransformer, SingleFileJavaAstTransformer, ToJavaAstTransformer} from './transform';

const logger = LoggerFactory.create(import.meta.url);

export const ZodParserOptionsContext = z.object({
  parserOptions: ZodParserOptions,
});

export const ZodJavaOptionsContext = z.object({
  javaOptions: ZodJavaOptions,
});

export const ZodJavaTargetContext = z.object({
    target: z.literal('java'),
  })
  .merge(ZodTargetFeaturesContext);

export const ZodJavaInitContextIn = ZodModelContext.extend({
  target: z.literal('java').or(z.undefined()),
});

export const ZodJavaInitContextOut = ZodModelContext
  .merge(ZodJavaOptionsContext)
  .merge(ZodJavaTargetContext);

export const ZodJavaContextIn = ZodModelContext
  .merge(ZodParserOptionsContext)
  .merge(ZodPackageOptionsContext)
  .merge(ZodTargetOptionsContext)
  .merge(ZodModelTransformOptionsContext)
  .merge(ZodJavaOptionsContext)
  .merge(ZodJavaTargetContext);

export const ZodJavaContextOut = ZodJavaContextIn
  .merge(ZodAstNodeContext);

export const JavaPluginInit = createPlugin(
  {
    name: 'java-init', in: ZodJavaInitContextIn, out: ZodJavaInitContextOut,
    action: ActionKind.RUNTIME_REFINES,
    scoreModifier: LATER_IS_BETTER,
  },
  async ctx => {

    if (ctx.target !== undefined && ctx.target != 'java') {
      return new z.ZodError([
        {code: 'custom', path: ['target'], message: `Target is not Java`},
      ]);
    }

    const javaOptions = ZodJavaOptions.safeParse({...ctx.defaults, ...ctx.arguments});
    if (!javaOptions.success) {
      return javaOptions.error;
    }

    return {
      ...ctx,
      target: 'java',
      javaOptions: javaOptions.data,
      targetFeatures: JAVA_FEATURES,
    } as const;
  },
);

export const JavaPlugin = createPlugin(
  {name: 'java', in: ZodJavaContextIn, out: ZodJavaContextOut, score: PluginScoreKind.REQUIRED},
  async ctx => {

    const transformerArgs: OmniModelTransformerArgs = {
      model: ctx.model,
      options: {...ctx.parserOptions, ...ctx.modelTransformOptions},
    };

    const transformers: OmniModelTransformer[] = [
      // new SimplifyInheritanceModelTransformer(),
      // new ElevatePropertiesModelTransformer(),
      // new GenericsModelTransformer(),
      new ElevatePropertiesModelTransformer(),
      new AggregateIntersectionsModelTransformer(),
      new CompositionGenericTargetToObjectJavaModelTransformer(),
      new InterfaceExtractorModelTransformer(),
      new SimplifyUnnecessaryCompositionsModelTransformer(),
    ];

    for (const transformer of transformers) {
      transformer.transformModel(transformerArgs);
    }

    const modelTransformer2Args: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & JavaOptions> = {
      model: transformerArgs.model,
      options: {...ctx.parserOptions, ...ctx.modelTransformOptions, ...ctx.targetOptions, ...ctx.javaOptions},
      targetFeatures: JAVA_FEATURES,
    };

    const transformers2: OmniModel2ndPassTransformer[] = [
      new ElevatePropertiesModelTransformer(),
      new GenericsModelTransformer(),
      new MergeLargeUnionLateModelTransformer(),
      new AlignObjectWithInterfaceModelTransformer(),
    ] as const;

    for (const transformer of transformers2) {
      transformer.transformModel2ndPass(modelTransformer2Args);
    }

    const astTransformers: AstTransformer<CodeRootAstNode, JavaAndTargetOptions>[] = [];
    astTransformers.push(new AddObjectDeclarationsCodeAstTransformer());
    astTransformers.push(new AddFieldsAstTransformer());
    astTransformers.push(new AddAccessorsForFieldsAstTransformer());
    astTransformers.push(new AddCompositionMembersCodeAstTransformer());
    astTransformers.push(new AddAbstractAccessorsAstTransformer());
    if (ctx.javaOptions.fieldAccessorMode !== FieldAccessorMode.LOMBOK) {
      // If the fields are managed by lombok, then we add no constructor.
      // TODO: Move to much later, so things like generic normalization/simplification has been done?
      astTransformers.push(new AddConstructorAstTransformer());
    }
    astTransformers.push(new AddLombokAstTransformer());
    astTransformers.push(new AddAdditionalPropertiesInterfaceAstTransformer());
    astTransformers.push(new AddJakartaValidationAstTransformer());
    astTransformers.push(new AddSubTypeHintsAstTransformer());
    astTransformers.push(new InnerTypeCompressionAstTransformer());
    astTransformers.push(new PatternPropertiesToMapJavaAstTransformer());
    astTransformers.push(new SingleFileJavaAstTransformer());
    astTransformers.push(new ResolveGenericSourceIdentifiersAstTransformer());
    astTransformers.push(new SimplifyGenericsAstTransformer());
    astTransformers.push(new MiscNodesToSpecificJavaAstTransformer());
    astTransformers.push(new RemoveConstantParametersAstTransformer());
    astTransformers.push(new JacksonJavaAstTransformer());
    astTransformers.push(new AddThrowsForKnownMethodsJavaAstTransformer());
    astTransformers.push(new BeanValidationJavaAstTransformer());
    astTransformers.push(new MapMemberAccessToJavaAstTransformer());
    astTransformers.push(new ToHardCodedTypeJavaAstTransformer());
    astTransformers.push(new ToConstructorBodySuperCallAstTransformer());
    astTransformers.push(new ToJavaAstTransformer());
    astTransformers.push(new DelegatesToJavaAstTransformer());
    astTransformers.push(new AddGeneratedAnnotationJavaAstTransformer());
    astTransformers.push(new AddCommentsAstTransformer());
    astTransformers.push(new PackageResolverAstTransformer());
    astTransformers.push(new GroupExampleTextsToSectionAstTransformer());
    astTransformers.push(new SimplifyTypePathsJavaAstTransformer());
    astTransformers.push(new SimplifyAndCleanAstTransformer());
    astTransformers.push(new SimplifyGenericsJavaAstTransformer());
    astTransformers.push(new ReorderMembersAstTransformer());
    astTransformers.push(new PrettyCodeAstTransformer());

    const rootNode = new JavaAstRootNode();

    const targetOptions: TargetOptions = {...ctx.parserOptions, ...ZodTargetOptions.parse({...ctx.defaults, ...ctx.targetOptions, ...ctx.arguments})};

    const astArgs: AstTransformerArguments<CodeRootAstNode, JavaAndTargetOptions> = {
      model: modelTransformer2Args.model,
      root: rootNode,
      externals: [],
      options: {...ctx.packageOptions, ...targetOptions, ...ctx.javaOptions},
      features: JAVA_FEATURES,
    };

    for (const transformer of astTransformers) {

      // We do the transformers in order.
      // Later we might batch them together based on "type" or "group" or whatever.
      transformer.transformAst(astArgs);
    }

    return {
      ...ctx,
      model: astArgs.model,
      astNode: astArgs.root,
      targetOptions: targetOptions,
    } satisfies z.infer<typeof ZodJavaContextOut>;
  },
);

export const JavaRendererCtxIn = ZodModelContext
  .merge(ZodAstNodeContext)
  .merge(ZodJavaOptionsContext)
  .merge(ZodJavaTargetContext);

export const JavaRendererCtxOut = JavaRendererCtxIn
  .merge(ZodAstNodeContext)
  .merge(ZodRenderersContext)
  .merge(ZodCompilationUnitsContext);

export const JavaRendererPlugin = createPlugin(
  {name: 'java-render', in: JavaRendererCtxIn, out: JavaRendererCtxOut, score: PluginScoreKind.IMPORTANT},
  async ctx => {

    const javaRootNode = ctx.astNode as Java.JavaAstRootNode;
    const renderer = createJavaRenderer(javaRootNode, ctx.javaOptions);
    const rendered = renderer.executeRender(ctx.astNode, renderer);

    return {
      ...ctx,
      renderers: [renderer],
      compilationUnits: rendered,
    };
  },
);

logger.info(`Registering Java plugins`);
export default PluginAutoRegistry.register([JavaPluginInit, JavaPlugin, JavaRendererPlugin]);
