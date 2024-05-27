import {BaseContext, FileContext, TargetContext} from '@omnigen/core-plugin';
import {Util, ZodCompilationUnitsContext} from '@omnigen/core-util';
import {z} from 'zod';
import {PluginManager} from '@omnigen/plugin';
import {OpenRpcPlugins} from '@omnigen/parser-openrpc';
import {CSharpOptions, CSharpPlugins} from '@omnigen/target-csharp';
import {LoggerFactory} from '@omnigen/core-log';
import {ModelTransformOptions, PackageOptions, ParserOptions, TargetOptions} from '@omnigen/core';

const logger = LoggerFactory.create(import.meta.url);

export type AllCSharpOptions = ParserOptions & ModelTransformOptions & PackageOptions & TargetOptions & CSharpOptions;

export class OpenRpcCSharpTestUtils {

  static async render(fileName: string, options?: Partial<AllCSharpOptions>) {

    logger.info(`Rendering with ${OpenRpcPlugins.default} and ${CSharpPlugins.default}`);

    const ctx: BaseContext & FileContext & TargetContext = {
      file: fileName.includes('/') ? fileName : Util.getPathFromRoot(`./packages/parser-openrpc/examples/${fileName}`),
      arguments: {
        ...options,
        target: 'csharp',
      },
    };

    const expected = ZodCompilationUnitsContext;
    const stopAt = ZodCompilationUnitsContext;

    const pm = new PluginManager({includeAuto: true});
    try {
      const execResult = await pm.execute({ctx: ctx, debug: true, stopAt: stopAt});
      const last = execResult.results[execResult.results.length - 1];

      const result = expected.parse(last.ctx) as z.output<typeof expected>;

      return result.compilationUnits;
    } catch (ex) {
      throw LoggerFactory.formatError(ex);
    }
  }
}
