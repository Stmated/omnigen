import {RenderedCompilationUnit, TargetOptions} from '@omnigen/api';
import {PluginManager} from '@omnigen/plugin';
import {CSharpOptions, CSharpPlugins} from '@omnigen/target-csharp';
import {LoggerFactory} from '@omnigen/core-log';
import {JsonSchemaPlugins} from '@omnigen/parser-jsonschema';
import {FileContext} from '@omnigen/core-plugin';

const logger = LoggerFactory.create(import.meta.url);

export class JsonSchemaToCSharpTestUtil {

  public static async render(inPath: string, options?: Partial<CSharpOptions & TargetOptions>): Promise<RenderedCompilationUnit[]> {

    const pm = new PluginManager({includeAuto: true});

    logger.info(`Running plugin manager with ${JsonSchemaPlugins.JsonSchemaPlugin.name} and ${CSharpPlugins.CSharpPlugin.name}`);

    const ctx: FileContext = {
      file: inPath,
      arguments: {
        target: 'csharp',
        ...options,
      },
    };

    const result = await pm.execute({
      ctx: ctx,
      stopAt: CSharpPlugins.CSharpRendererCtxOut,
    });

    return result.result.ctx.compilationUnits;
  }
}
