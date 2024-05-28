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
  AstTransformer,
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
  ZodPackageOptions,
  ZodParserOptions,
  ZodTargetOptions,
} from '@omnigen/core';
import {z} from 'zod';
import {SpreadResolvedWildcardGenericsModelTransformer, ZodCompilationUnitsContext} from '@omnigen/core-util';
import {createCSharpRenderer} from './render';
import {CSharpOptions, ZodCSharpOptions} from './options';
import {LoggerFactory} from '@omnigen/core-log';
import {CSHARP_FEATURES} from './features';
import {Cs, CSharpRootNode} from './ast';
import {AddPropertyAccessorCSharpAstTransformer} from './ast/AddPropertyAccessorCSharpAstTransformer.ts';
import {NamespaceWrapperAstTransformer} from './ast/NamespaceWrapperAstTransformer.ts';
import {DelegatesToCSharpAstTransformer} from './ast/DelegatesToCSharpAstTransformer.ts';
import {NonNumericEnumToConstClassAstTransformer} from './ast/NonNumericEnumToConstClassAstTransformer.ts';
import {ToCSharpAstTransformer} from './ast/ToCSharpAstTransformer.ts';
import {NamespaceCompressionAstTransformer} from './ast/NamespaceCompressionAstTransformer.ts';
import {
  AddAbstractAccessorsAstTransformer,
  AddAdditionalPropertiesInterfaceAstTransformer,
  AddCommentsAstTransformer,
  AddCompositionMembersCodeAstTransformer,
  AddConstructorCodeAstTransformer,
  AddFieldsAstTransformer,
  AddGeneratedCommentAstTransformer,
  AddObjectDeclarationsCodeAstTransformer,
  DeleteUnnecessaryCompositionsJavaModelTransformer,
  InnerTypeCompressionAstTransformer,
  InterfaceExtractorModelTransformer,
  MethodToGetterCodeAstTransformer,
  PackageResolverAstTransformer,
  RemoveConstantParametersAstTransformer,
  RemoveEnumFieldsCodeAstTransformer,
  ReorderMembersAstTransformer,
  ResolveGenericSourceIdentifiersAstTransformer, SimplifyAndCleanAstTransformer,
  SimplifyGenericsAstTransformer,
  SortVisitorRegistry,
} from '@omnigen/target-code';
import {SimplifyTypePathsCSharpAstTransformer} from './ast/SimplifyTypePathsCSharpAstTransformer.ts';
import {AddCommentsCSharpAstTransformer} from './ast/AddCommentsCSharpAstTransformer.ts';
import {JsonCSharpAstTransformer} from './ast/JsonCSharpAstTransformer.ts';
import {ConstructorRemovalOnPropertyInitCSharpAstTransformer} from './ast/ConstructorRemovalOnPropertyInitCSharpAstTransformer.ts';

const logger = LoggerFactory.create(import.meta.url);

export type CSharpAstTransformerArgs = AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions & CSharpOptions>;

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
  .merge(ZodCSharpTargetContext);

export const ZodCSharpContextIn = ZodModelContext
    .merge(ZodParserOptionsContext)
    .merge(ZodPackageOptionsContext)
    .merge(ZodTargetOptionsContext)
    .merge(ZodModelTransformOptionsContext)
    .merge(ZodCSharpOptionsContext)
    .merge(ZodCSharpTargetContext)
;

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

    const order = [
      Cs.PropertyNode,
      Cs.ConstructorDeclaration,
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
      new InterfaceExtractorModelTransformer(),
      new DeleteUnnecessaryCompositionsJavaModelTransformer(),
    ];

    for (const transformer of transformers) {
      transformer.transformModel(modelTransformerArgs);
    }

    // Then do 2nd pass transforming

    type TOpt = ParserOptions & TargetOptions & CSharpOptions;

    const modelTransformer2Args: OmniModelTransformer2ndPassArgs<TOpt> = {
      model: ctx.model,
      options: {
        ...ctx.parserOptions,
        ...ctx.modelTransformOptions,
        ...ctx.targetOptions,
        ...ctx.csOptions,
      },
      targetFeatures: CSHARP_FEATURES,
    };

    const transformers2: OmniModel2ndPassTransformer<TOpt>[] = [
      // new StrictUndefinedTypeScriptModelTransformer(),
      // new RemoveWildcardGenericParamTypeScriptModelTransformer(),
      new SpreadResolvedWildcardGenericsModelTransformer(),
    ] as const;

    for (const transformer of transformers2) {

      transformer.transformModel2ndPass(modelTransformer2Args);
    }

    const astNode = new CSharpRootNode([]);

    const astTransformers: AstTransformer<CSharpRootNode, PackageOptions & TargetOptions & CSharpOptions>[] = [
      new AddObjectDeclarationsCodeAstTransformer(),
      new AddFieldsAstTransformer(),
      new NonNumericEnumToConstClassAstTransformer(),
      // // new AddAccessorsForFieldsAstTransformer(),
      new AddAbstractAccessorsAstTransformer(),
      new AddCompositionMembersCodeAstTransformer(),
      new AddConstructorCodeAstTransformer(),
      new AddAdditionalPropertiesInterfaceAstTransformer(),
      new AddCommentsAstTransformer(),
      // new AddSubTypeHintsAstTransformer(),
      new NamespaceWrapperAstTransformer(),
      // new SiblingTypeCompressionAstTransformer(),
      new InnerTypeCompressionAstTransformer(),
      new NamespaceCompressionAstTransformer(),

      // new AddThrowsForKnownMethodsAstTransformer(),
      new ResolveGenericSourceIdentifiersAstTransformer(),
      new SimplifyGenericsAstTransformer(),
      // new CompositionTypeScriptAstTransformer(),

      new MethodToGetterCodeAstTransformer(),
      // new RemoveSuperfluousGetterTypeScriptAstTransformer(),
      new RemoveConstantParametersAstTransformer(),
      // new InterfaceToTypeAliasTypeScriptAstTransformer(),
      // new ToHardCodedTypeTypeScriptAstTransformer(),
      // new SingleFileTypeScriptAstTransformer(),
      new RemoveEnumFieldsCodeAstTransformer(),
      new AddPropertyAccessorCSharpAstTransformer(),
      new JsonCSharpAstTransformer(),
      new ToCSharpAstTransformer(),
      // new GenericNodesToSpecificJavaAstTransformer(), // TODO: Add back in again?
      new DelegatesToCSharpAstTransformer(),
      new AddCommentsCSharpAstTransformer(),
      new ConstructorRemovalOnPropertyInitCSharpAstTransformer(),

      new PackageResolverAstTransformer(),
      new SimplifyTypePathsCSharpAstTransformer(),
      new NonNumericEnumToConstClassAstTransformer(),
      new ReorderMembersAstTransformer(),
      new SimplifyAndCleanAstTransformer(),
      new AddGeneratedCommentAstTransformer(),
    ] as const;

    const options: PackageOptions & TargetOptions & CSharpOptions = {
      ...ctx.packageOptions,
      ...ctx.targetOptions,
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

export const CSharpRendererCtxInBase = ZodModelContext
  .merge(ZodAstNodeContext)
  .merge(ZodCSharpOptionsContext)
  .merge(ZodCSharpTargetContext);

export const ZodOptionalOptionsContext = z.object({
  packageOptions: ZodPackageOptions.partial().optional(),
  targetOptions: ZodTargetOptions.partial().optional(),
});

export const CSharpRendererCtxIn = CSharpRendererCtxInBase
  .merge(ZodOptionalOptionsContext)
;

export const CSharpRendererCtxOut = CSharpRendererCtxInBase
  .merge(ZodAstNodeContext)
  .merge(ZodRenderersContext)
  .merge(ZodCompilationUnitsContext);

export const CSharpRendererPlugin = createPlugin(
  {name: 'cs-render', in: CSharpRendererCtxIn, out: CSharpRendererCtxOut, score: PluginScoreKind.IMPORTANT},
  async ctx => {

    const rootTsNode = ctx.astNode as CSharpRootNode;

    const options: PackageOptions & TargetOptions & CSharpOptions = {
      ...DEFAULT_PACKAGE_OPTIONS,
      ...DEFAULT_TARGET_OPTIONS,
      ...ctx.csOptions,
    };

    copyDefinedProperties(ctx.packageOptions, options);
    copyDefinedProperties(ctx.targetOptions, options);

    const renderer = createCSharpRenderer(rootTsNode, options);
    const rendered = renderer.executeRender(ctx.astNode, renderer);

    const singleFileName = ctx.csOptions.singleFileName;
    if (rendered.length == 1 && singleFileName) {

      if (singleFileName.includes('.')) {
        rendered[0].fileName = singleFileName;
      } else {
        rendered[0].fileName = `${singleFileName}.cs`;
      }
    }

    return {
      ...ctx,
      renderers: [renderer],
      compilationUnits: rendered,
    };
  },
);

function copyDefinedProperties(source: any, target: any) {

  if (source) {
    for (const key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) {
        continue;
      }

      const value = source[key];
      if (value !== undefined) {
        target[key] = value;
      }
    }
  }
}

logger.info(`Registering C# plugins`);
export default PluginAutoRegistry.register([CSharpPluginInit, CSharpPlugin, CSharpRendererPlugin]);
