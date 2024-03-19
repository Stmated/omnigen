import {RenderedCompilationUnit, TargetOptions} from '@omnigen/core';
import {PluginManager} from '@omnigen/plugin';
import {TypeScriptOptions, TypeScriptPlugins} from '@omnigen/target-typescript';
import {LoggerFactory} from '@omnigen/core-log';
import {JsonSchemaPlugins} from '@omnigen/parser-jsonschema';
import {FileContext, TargetContext} from '@omnigen/core-plugin';
import {JavaOptions, SerializationLibrary} from '@omnigen/target-java';

const logger = LoggerFactory.create(import.meta.url);

export class JsonSchemaToTypeScriptTestUtil {

  public static async render(inPath: string, options?: Partial<TypeScriptOptions & TargetOptions>): Promise<RenderedCompilationUnit[]> {

    const pm = new PluginManager({includeAuto: true});

    logger.info(`Running plugin manager with ${JsonSchemaPlugins.JsonSchemaPlugin.name} and ${TypeScriptPlugins.TypeScriptPluginInit.name}`);

    const ctx: FileContext & TargetContext = {
      file: inPath,
      target: 'typescript',
      arguments: {
        ...options,
        ...{
          serializationLibrary: SerializationLibrary.POJO,
        } satisfies Partial<JavaOptions>,
      },
    };

    const result = await pm.execute({
      ctx: ctx,
      stopAt: TypeScriptPlugins.TypeScriptRendererCtxOut,
    });

    return result.result.ctx.compilationUnits;
  }
}
