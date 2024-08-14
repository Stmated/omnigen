import {RenderedCompilationUnit, TargetOptions} from '@omnigen/api';
import {PluginManager} from '@omnigen/plugin';
import {JavaOptions, JavaPlugins, SerializationLibrary} from '@omnigen/target-java';
import {LoggerFactory} from '@omnigen/core-log';
import {JsonSchemaPlugins} from '@omnigen/parser-jsonschema';
import {FileContext} from '@omnigen/core-plugin';
import {DEFAULT_SPECIFIC_TEST_TARGET_OPTIONS} from '@omnigen/utils-test';

const logger = LoggerFactory.create(import.meta.url);

/**
 * TODO: This and the same object from openrpc java test package should be in one place
 */
export const DEFAULT_SPECIFIC_TEST_JAVA_OPTIONS: Partial<JavaOptions> = {
  serializationLibrary: SerializationLibrary.POJO,
  beanValidation: false,
};

export class JsonSchemaToJavaTestUtil {

  public static async render(inPath: string, options?: Partial<JavaOptions & TargetOptions>): Promise<RenderedCompilationUnit[]> {

    const pm = new PluginManager({includeAuto: true});

    logger.info(`Running plugin manager with ${JsonSchemaPlugins.JsonSchemaPlugin.name} and ${JavaPlugins.JavaPluginInit.name}`);

    const ctx: FileContext = {
      file: inPath,
      defaults: {
      },
      arguments: {
        ...DEFAULT_SPECIFIC_TEST_JAVA_OPTIONS,
        ...DEFAULT_SPECIFIC_TEST_TARGET_OPTIONS,
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
