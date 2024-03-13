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
  ZodTargetContext,
  ZodTargetOptionsContext,
} from '@omnigen/core-plugin';
import {JavaInterpreter} from './interpret';
import {CompositionGenericTargetToObjectJavaModelTransformer, InterfaceJavaModelTransformer} from './parse';
import {createJavaRenderer, JAVA_FEATURES, ZodJavaOptions} from '.';
import {OmniModelTransformerArgs, ParserOptions, ZodAstNodeContext, ZodParserOptions, ZodTargetFeatures} from '@omnigen/core';
import {z} from 'zod';
import {ZodCompilationUnitsContext} from '@omnigen/core-util';
import {DeleteUnnecessaryXorJavaModelTransformer} from './parse/transform/DeleteUnnecessaryXorJavaModelTransformer.ts';

export const ZodParserOptionsContext = z.object({
  parserOptions: ZodParserOptions,
});

export const ZodJavaOptionsContext = z.object({
  javaOptions: ZodJavaOptions,
});

export const ZodJavaTargetContext = z.object({
  target: z.literal('java'),
  targetFeatures: ZodTargetFeatures,
});

export const ZodJavaInitContextIn = ZodModelContext
  .merge(ZodTargetContext);

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

export type JavaOptionsContext = z.output<typeof ZodJavaOptionsContext>;

export const JavaPluginInit = createPlugin(
  {
    name: 'java-init', in: ZodJavaInitContextIn, out: ZodJavaInitContextOut,
    action: ActionKind.SPLITS,
    scoreModifier: LATER_IS_BETTER,
  },
  async ctx => {

    if (ctx.target !== undefined && ctx.target != 'java') {
      return new z.ZodError([
        {code: 'custom', path: ['target'], message: `Target is not Java`},
      ]);
    }

    const javaOptions = ZodJavaOptions.safeParse(ctx.arguments);
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

    const transformerArgs: OmniModelTransformerArgs<ParserOptions> = {
      model: ctx.model,
      options: {...ctx.parserOptions, ...ctx.modelTransformOptions},
    };

    const transformers = [
      new CompositionGenericTargetToObjectJavaModelTransformer(),
      new InterfaceJavaModelTransformer(),
      new DeleteUnnecessaryXorJavaModelTransformer(),
    ];

    for (const transformer of transformers) {
      transformer.transformModel(transformerArgs);
    }

    const interpreter = new JavaInterpreter(
      {...ctx.javaOptions, ...ctx.targetOptions, ...ctx.packageOptions},
      JAVA_FEATURES,
    );

    const astNode = interpreter.buildSyntaxTree(ctx.model, []);

    return {
      ...ctx,
      astNode: astNode,
    };
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

    const renderer = createJavaRenderer(ctx.javaOptions);
    const rendered = renderer.executeRender(ctx.astNode, renderer);

    return {
      ...ctx,
      renderers: [renderer],
      compilationUnits: rendered,
    };
  },
);

export default PluginAutoRegistry.register([JavaPluginInit, JavaPlugin, JavaRendererPlugin]);

