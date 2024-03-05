import {z, ZodError, ZodType} from 'zod';
import {
  OmniModel,
  OmniModelLibrary,
  OmniTypeLibrary,
  Renderer,
  ZodCoercedBoolean,
  ZodModelTransformOptions,
  ZodOptions,
  ZodPackageOptions,
  ZodParserOptions,
  ZodTargetFeatures,
  ZodTargetOptions,
} from '@omnigen/core';

export enum PluginScoreKind {
  SUITABLE = 1,
  IMPROVING = 2,
  IMPORTANT = 3,
  ESSENTIAL = 4,
  REQUIRED = 5,
}

export const ZodArguments = z.record(z.string(), z.any());

export const ZodArgumentsContext = z.object({
  arguments: ZodArguments,
});

export const ZOD_CONTEXT_TARGETS = z.object({
  targets: z.array(z.string()),
});

export const ZodTargetContext = z.object({
  target: z.string().optional(),
});

export const ZodSourceContext = z.object({
  source: z.string(),
});

export const ZodBaseContext = ZodArgumentsContext;

export const ZodModelContext = ZodBaseContext.extend({
  model: z.custom<OmniModel>(),
});

export const ZodParserOptionsContext = ZodBaseContext.extend({
  parserOptions: ZodParserOptions,
});

export const ZodModelTransformOptionsContext = ZodBaseContext.extend({
  modelTransformOptions: ZodModelTransformOptions,
});

export const ZodRenderersContext = z.object({
  renderers: z.array(z.custom<Renderer>()),
});

export const ZodFilesContext = ZodBaseContext.extend({
  files: z.array(z.string()).min(1),
});

export const ZodFileContext = ZodBaseContext.extend({
  file: z.string(),
});

export const ZodTargetOptionsContext = ZodBaseContext.extend({
  targetOptions: ZodTargetOptions,
});

export const ZodPackageOptionsContext = ZodBaseContext.extend({
  packageOptions: ZodPackageOptions,
});

export const ZodFileWriteOptions = ZodOptions.extend({
  outputFiles: ZodCoercedBoolean.default('f'),
  outputDirBase: z.string().default('./.generated'),
});

export const ZodFileWriteOptionsContext = z.object({
  fileWriteOptions: ZodFileWriteOptions,
});

export const ZodTargetFeaturesContext = z.object({
  targetFeatures: ZodTargetFeatures,
});

export const ZodTypeLibraryContext = z.object({
  types: z.custom<OmniTypeLibrary>(),
});

export const ZodModelLibraryContext = z.object({
  models: z.custom<OmniModelLibrary>(),
});

export type BaseContext = z.infer<typeof ZodBaseContext>;
export type FilesContext = z.infer<typeof ZodFilesContext>;
export type FileContext = z.infer<typeof ZodFileContext>;
export type TargetContext = z.infer<typeof ZodTargetContext>;
export type SourceContext = z.infer<typeof ZodSourceContext>;
export type ParserOptionsContext = z.output<typeof ZodParserOptionsContext>;
export type ModelContext = z.infer<typeof ZodModelContext>;
export type PackageOptionsContext = z.output<typeof ZodPackageOptionsContext>;
export type FileWriteOptionsContext = z.output<typeof ZodFileWriteOptionsContext>;
export type TypeLibraryContext = z.output<typeof ZodTypeLibraryContext>;

export type FileWriteOptions = z.output<typeof ZodFileWriteOptions>;

export enum ActionKind {
  NORMAL = 0,
  SPLITS = 1,
  MERGES = 2,
  RUNTIME_REFINES = 3,
}

/**
 * Return Zod error if the plugin is not valid to run, but there is no real *error*.
 *
 * If something goes actually wrong, then throw a new `Error`.
 */
export type Plugin2ExecuteResult<CR extends ZodType> = Promise<z.output<CR> | ZodError>;

export interface Plugin2<
  CT extends ZodType = ZodType,
  CR extends ZodType = ZodType,
  Res extends Plugin2ExecuteResult<CR> = Plugin2ExecuteResult<CR>
> {
  name: string;
  input: CT;
  output: CR;
  score: PluginScoreKind;
  scoreModifier?: ScoreModifier | undefined;
  action?: ActionKind;

  execute(ctx: z.output<CT>): Res;
}

export type ScoreModifier = ((score: PluginScoreKind, count: number, idx: number) => PluginScoreKind);

export const EARLIER_IS_BETTER: ScoreModifier = (score, count, idx) => score * (1 - (idx / (count - 1)));
export const LATER_IS_BETTER: ScoreModifier = (score, count, idx) => score * (idx / count);

export function createPlugin<In extends ZodType, Out extends ZodType, Res extends Plugin2ExecuteResult<Out>>(
  options: {
    name: string;
    in: In;
    out: Out;
    action?: ActionKind;
    score?: PluginScoreKind;
    scoreModifier?: ScoreModifier;
  },
  execute: (ctx: z.output<In>) => Res,
): Plugin2<In, Out> {

  return {
    name: options.name,
    input: options.in,
    output: options.out,
    score: options.score ?? PluginScoreKind.SUITABLE,
    scoreModifier: options.scoreModifier,
    execute: execute,
  };
}
