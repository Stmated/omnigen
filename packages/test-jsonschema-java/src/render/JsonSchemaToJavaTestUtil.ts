import {RenderedCompilationUnit, TargetOptions} from '@omnigen/api';
import {PluginManager} from '@omnigen/plugin';
import {JavaOptions, JavaPlugins} from '@omnigen/target-java';
import {LoggerFactory} from '@omnigen/core-log';
import {JsonSchemaPlugins} from '@omnigen/parser-jsonschema';
import {FileContext} from '@omnigen/core-plugin';

const logger = LoggerFactory.create(import.meta.url);

export class JsonSchemaToJavaTestUtil {

  public static async render(inPath: string, options?: Partial<JavaOptions & TargetOptions>): Promise<RenderedCompilationUnit[]> {

    const pm = new PluginManager({includeAuto: true});

    logger.info(`Running plugin manager with ${JsonSchemaPlugins.JsonSchemaPlugin.name} and ${JavaPlugins.JavaPluginInit.name}`);

    const ctx: FileContext = {
      file: inPath,
      defaults: {

      },
      arguments: {
        ...options,
      },
    };

    const result = await pm.execute({
      ctx: ctx,
      stopAt: JavaPlugins.JavaRendererCtxOut,
    });

    return result.result.ctx.compilationUnits;
  }
}
