import {
  createPlugin,
  PluginAutoRegistry,
  ZodArgumentsContext,
  ZodBaseContext,
  ZodFileContext,
  ZodFileWriteOptions,
  ZodFileWriteOptionsContext,
  ZodModelContext,
  ZodModelTransformOptionsContext,
  ZodParserOptionsContext, ZodTargetFeaturesContext,
  ZodTargetOptionsContext, ZodTypeLibraryContext,
} from '@omnigen/core-plugin';
import {
  ElevatePropertiesModelTransformer,
  GenericsModelTransformer,
  SchemaFile,
  SimplifyInheritanceModelTransformer,
} from './parse';
import {OmniModel2ndPassTransformer, OmniModelTransformer, RenderedCompilationUnit} from '@omnigen/core';
import {FileWriter} from './write';
import {z} from 'zod';
import {DefaultOmniTypeLibrary} from './parse/DefaultOmniTypeLibrary.ts';

export * from './equality';
export * from './interpret';
export * from './parse';
export * from './util';
export * from './visit';
export * from './write';

export const ZodSchemaFileContext = ZodBaseContext.extend({
  schemaFile: z.custom<SchemaFile>(),
});

export const ZodCompilationUnitsContext = z.object({
  compilationUnits: z.array(z.custom<RenderedCompilationUnit>()),
});

export type CompilationUnitsContext = z.output<typeof ZodCompilationUnitsContext>;

export const ZodWrittenFilesContext = z.object({
  writtenFiles: z.array(z.string()),
});

const schemaFilePlugin = createPlugin(
  {name: 'sf', in: ZodFileContext, out: ZodSchemaFileContext},
  async ctx => {

    return {
      ...ctx,
      schemaFile: new SchemaFile(ctx.file, ctx.file),
    };
  },
);


const TypeLibraryPlugin = createPlugin(
  {name: 'tl', in: ZodArgumentsContext, out: ZodTypeLibraryContext},
  async ctx => {

    return {
      ...ctx,
      types: new DefaultOmniTypeLibrary(),
    };
  },
);


const CommonTransformersIn = ZodModelContext
  .merge(ZodParserOptionsContext)
  .merge(ZodModelTransformOptionsContext);

const commonTransformers = createPlugin(
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

const commonTransformers2 = createPlugin(
  {name: 'transform2', in: CommonTransformers2In, out: CommonTransformers2In},
  async ctx => {

    const transformers: OmniModel2ndPassTransformer<typeof ctx.parserOptions, typeof ctx.targetOptions>[] = [
      new ElevatePropertiesModelTransformer(),
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
  // .merge(ZodFileWriteOptionsContext)
  .merge(ZodWrittenFilesContext);

const fileWriter = createPlugin(
  {name: 'file-writer', in: FileWriterIn, out: FileWriterOut},
  async ctx => {

    const fileWriteOptions = ZodFileWriteOptions.parse(ctx.arguments);
    const fileWriter = new FileWriter(fileWriteOptions.outputDirBase);
    const filesWritten: string[] = [];

    for (const rcu of ctx.compilationUnits) {

      await fileWriter.write(rcu);
      filesWritten.push(rcu.fileName);
    }

    return {
      ...ctx,
      fileWriteOptions: fileWriteOptions,
      writtenFiles: filesWritten,
    };
  },
);

export default PluginAutoRegistry.register([schemaFilePlugin, TypeLibraryPlugin, commonTransformers, commonTransformers2, fileWriter]);
