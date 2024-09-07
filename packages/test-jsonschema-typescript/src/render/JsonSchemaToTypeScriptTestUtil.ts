import {RenderedCompilationUnit, TargetOptions} from '@omnigen/api';
import {PluginManager} from '@omnigen/plugin';
import {TypeScriptOptions, TypeScriptPlugins} from '@omnigen/target-typescript';
import {LoggerFactory} from '@omnigen/core-log';
import {JsonSchemaPlugins} from '@omnigen/parser-jsonschema';
import {FileContext, TargetContext} from '@omnigen/core-plugin';
import {DEFAULT_SPECIFIC_TEST_TARGET_OPTIONS} from '@omnigen/utils-test';

const logger = LoggerFactory.create(import.meta.url);

export class JsonSchemaToTypeScriptTestUtil {

  public static async render(inPath: string, options?: Partial<TypeScriptOptions> & Partial<TargetOptions>): Promise<RenderedCompilationUnit[]> {

    const pm = new PluginManager({includeAuto: true});

    logger.info(`Running plugin manager with ${JsonSchemaPlugins.JsonSchemaPlugin.name} and ${TypeScriptPlugins.TypeScriptPluginInit.name}`);

    const ctx: FileContext & TargetContext = {
      file: inPath,
      target: 'typescript',
      arguments: {
        ...DEFAULT_SPECIFIC_TEST_TARGET_OPTIONS,
        ...options,
        target: 'typescript',
      },
    };

    try {
      const result = await pm.execute({
        ctx: ctx,
        stopAt: TypeScriptPlugins.TypeScriptRendererCtxOut,
      });

      return result.result.ctx.compilationUnits;
    } catch (ex) {
      throw LoggerFactory.formatError(ex);
    }
  }
}
