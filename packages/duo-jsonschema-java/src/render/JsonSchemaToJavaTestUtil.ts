import {RenderedCompilationUnit} from '@omnigen/core';
import {PluginManager} from '@omnigen/plugin';
import {JavaOptions, JavaPlugins} from '@omnigen/target-java';
import {LoggerFactory} from '@omnigen/core-log';
import {JsonSchemaPlugins} from '@omnigen/parser-jsonschema';
import {FileContext} from '@omnigen/core-plugin';

const logger = LoggerFactory.create(import.meta.url);

export class JsonSchemaToJavaTestUtil {

  public static async render(inPath: string, options?: JavaOptions): Promise<RenderedCompilationUnit[]> {

    const pm = new PluginManager({includeAuto: true});

    logger.info(`Running plugin manager with ${JsonSchemaPlugins.JsonSchemaPlugin.name} and ${JavaPlugins.JavaPluginInit.name}`);

    // pm.addPlugin(new JavaPlugin);

    const ctx: FileContext = {
      file: inPath,
      arguments: {
        ...options,
      },
      // target: 'java', // <-- implicit, because we have no other target plugin in this package
      // arguments: {
      //   ...all.modelTransformOptions,
      //   ...all.parserOptions,
      //   ...all.targetOptions,
      //   ...all.packageOptions,
      //   ...all.javaOptions,
      //   ...all.arguments,
      // },
    };

    const result = await pm.execute({
      ctx: ctx,
      stopAt: JavaPlugins.JavaRendererCtxOut,
    });

    return result.result.ctx.compilationUnits;
  }
}
