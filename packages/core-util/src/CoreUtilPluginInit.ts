import {
  createPlugin,
  ZodArgumentsContext,
  ZodBaseContext,
  ZodFileContext,
  ZodFileWriteOptions,
  ZodFileWriteOptionsContext,
  ZodModelContext,
  ZodModelLibraryContext,
  ZodModelTransformOptionsContext,
  ZodPackageOptionsContext,
  ZodParserOptionsContext,
  ZodTargetFeaturesContext,
  ZodTargetOptionsContext,
  ZodTypeLibraryContext,
} from '@omnigen/core-plugin';
import {z} from 'zod';
import {ConflictingIntersectionModelTransformer, ElevatePropertiesModelTransformer, GenericsModelTransformer, SchemaFile, SimplifyInheritanceModelTransformer} from './parse';
import {OmniModel2ndPassTransformer, OmniModelTransformer, RenderedCompilationUnit, ZodModelTransformOptions, ZodPackageOptions, ZodParserOptions, ZodTargetOptions} from '@omnigen/core';
import {DefaultOmniTypeLibrary} from './parse/DefaultOmniTypeLibrary.ts';
import {FileWriter} from './write';
import {DefaultOmniModelLibrary} from './parse/DefaultOmniModelLibrary.ts';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

export const ZodSchemaFileContext = ZodBaseContext.extend({
  schemaFile: z.custom<SchemaFile>(it => it !== undefined && it instanceof SchemaFile),
});

export const ZodCompilationUnitsContext = z.object({
  compilationUnits: z.array(z.custom<RenderedCompilationUnit>()),
});

export const ZodWrittenFilesContext = z.object({
  writtenFiles: z.array(z.string()),
});

export const ZodSomeTargetContextOut = ZodBaseContext.extend({
  target: z.string().or(z.undefined()),
});

const TypeLibraryPluginOut = ZodTypeLibraryContext
  .merge(ZodModelLibraryContext);

const ZodStdOptionsContext = ZodArgumentsContext
  .merge(ZodParserOptionsContext)
  .merge(ZodTargetOptionsContext)
  .merge(ZodModelTransformOptionsContext)
  .merge(ZodPackageOptionsContext);

const CorePluginOut = ZodSchemaFileContext
  .merge(ZodStdOptionsContext)
  .merge(ZodFileWriteOptionsContext)
  .merge(TypeLibraryPluginOut)
  .merge(ZodSomeTargetContextOut)
;

export const CorePlugin = createPlugin(
  {name: 'core', in: ZodFileContext, out: CorePluginOut},
  async ctx => {

    const packageOptions = ZodPackageOptions.parse(ctx.arguments);
    const fileWriteOptions = ZodFileWriteOptions.parse(ctx.arguments);
    const parserOptions = ZodParserOptions.parse(ctx.arguments);
    const targetOptions = ZodTargetOptions.parse(ctx.arguments);

    return {
      ...ctx,
      target: ctx.arguments.target,
      schemaFile: new SchemaFile(ctx.file, ctx.file),
      parserOptions: parserOptions,
      modelTransformOptions: ZodModelTransformOptions.parse(ctx.arguments),
      targetOptions: targetOptions,
      packageOptions: packageOptions,
      fileWriteOptions: fileWriteOptions,
      types: new DefaultOmniTypeLibrary(),
      models: new DefaultOmniModelLibrary(),
    } satisfies z.output<typeof CorePluginOut>;
  },
);

const CommonTransformersIn = ZodModelContext
  .merge(ZodParserOptionsContext)
  .merge(ZodModelTransformOptionsContext);

export const CommonTransformPlugin = createPlugin(
  {name: 'transform', in: CommonTransformersIn, out: ZodModelContext},
  async ctx => {

    const transformers: OmniModelTransformer[] = [
      new SimplifyInheritanceModelTransformer(),
      new ElevatePropertiesModelTransformer(),
      new GenericsModelTransformer(),
    ];

    for (const transformer of transformers) {
      transformer.transformModel({
        model: ctx.model,
        options: {...ctx.parserOptions, ...ctx.modelTransformOptions},
      });
    }

    return ctx;
  },
);

const CommonTransformers2In = ZodModelContext
  .merge(ZodParserOptionsContext)
  .merge(ZodModelTransformOptionsContext)
  .merge(ZodTargetOptionsContext)
  .merge(ZodTargetFeaturesContext);

export const CommonTransform2Plugin = createPlugin(
  {name: 'transform2', in: CommonTransformers2In, out: CommonTransformers2In},
  async ctx => {

    const transformers: OmniModel2ndPassTransformer<typeof ctx.parserOptions & typeof ctx.targetOptions>[] = [
      new ElevatePropertiesModelTransformer(),
      new ConflictingIntersectionModelTransformer(),
      new SimplifyInheritanceModelTransformer(),
    ];

    for (const transformer of transformers) {
      transformer.transformModel2ndPass({
        model: ctx.model,
        options: {...ctx.parserOptions, ...ctx.modelTransformOptions, ...ctx.targetOptions},
        targetFeatures: ctx.targetFeatures,
      });
    }

    return ctx;
  },
);


const FileWriterIn = ZodArgumentsContext
  .merge(ZodFileWriteOptionsContext)
  .merge(ZodCompilationUnitsContext);

const FileWriterOut = FileWriterIn
  .merge(ZodWrittenFilesContext);

export const fileWriter = createPlugin(
  {name: 'file-writer', in: FileWriterIn, out: FileWriterOut},
  async ctx => {

    const fileWriteOptions = ZodFileWriteOptions.parse(ctx.arguments);
    const filesWritten: string[] = [];

    logger.info(`Will start writing '${ctx.compilationUnits.length}' files: ${ctx.compilationUnits.map(it => it.fileName)}`);

    if (fileWriteOptions.outputFiles) {

      const fileWriter = new FileWriter(fileWriteOptions.outputDirBase);

      const parts = ctx.fileWriteOptions.outputDirBase.split('/');
      const fileName = parts[parts.length - 1];
      const isFileName = fileName.match(/\w+\.\w{1,3}/);

      if (isFileName) {
        if (ctx.compilationUnits.length == 1) {

          // We are only outputting one file, and the output path is a file name, so we will just remove the filename and the directory will be the filename.
          logger.info(`Skipping filename ${ctx.compilationUnits[0].fileName} since output path is a filepath ${fileWriteOptions.outputDirBase}`);
          ctx.compilationUnits[0].fileName = '';
        } else {
          throw new Error(`The output path is a filepath, but there are several compilation units`);
        }
      }

      for (const rcu of ctx.compilationUnits) {

        await fileWriter.write(rcu);
        filesWritten.push(rcu.fileName);
      }
    }

    return {
      ...ctx,
      fileWriteOptions: fileWriteOptions,
      writtenFiles: filesWritten,
    };
  },
);
