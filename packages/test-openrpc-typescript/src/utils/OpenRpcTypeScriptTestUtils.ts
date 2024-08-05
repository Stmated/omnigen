import {Util, ZodCompilationUnitsContext} from '@omnigen/core';
import {ModelTransformOptions, PackageOptions, ParserOptions, RenderedCompilationUnit, TargetOptions} from '@omnigen/api';
import {BaseContext, FileContext, TargetContext} from '@omnigen/core-plugin';
import {PluginManager} from '@omnigen/plugin';
import {TypeScriptOptions, TypeScriptPlugins} from '@omnigen/target-typescript';
import {OpenRpcPlugins} from '@omnigen/parser-openrpc';
import {z} from 'zod';

export type TypeScriptTestOptions = ParserOptions & ModelTransformOptions & TargetOptions & PackageOptions & TypeScriptOptions

export interface TypeScriptTestUtilsOptions {
  options?: Partial<TypeScriptTestOptions>;
  arguments?: Record<string, any>;
}

export class OpenRpcTypeScriptTestUtils {

  public static async getFileContentsFromFile(fileName: string, options?: TypeScriptTestUtilsOptions, source = 'openrpc'): Promise<Map<string, string>> {

    // eslint-disable-next-line @typescript-eslint/naming-convention,camelcase
    const referenced_so_plugin_is_registered = [
      TypeScriptPlugins.default,
      OpenRpcPlugins.default,
    ];

    const filePath = Util.getPathFromRoot(`./packages/parser-${source}/examples/${fileName}`);

    const ctx: BaseContext & FileContext & TargetContext = {
      file: filePath,
      arguments: {
        ...options?.options,
        ...options?.arguments,
        target: 'typescript',
      },
    };

    const pm = new PluginManager({includeAuto: true});
    const result = await pm.execute({ctx: ctx, debug: true, stopAt: undefined});
    const last = result.results[result.results.length - 1];

    const parsedResult = ZodCompilationUnitsContext.parse(last.ctx) as z.output<typeof ZodCompilationUnitsContext>; // z.output<ZodCompilationUnitsContext>;

    return OpenRpcTypeScriptTestUtils.cuToContentMap(parsedResult.compilationUnits);
  }

  public static cuToContentMap(compilationUnits: RenderedCompilationUnit[]) {
    const fileContents = new Map<string, string>();

    for (const render of compilationUnits) {
      fileContents.set(render.fileName, render.content);
    }

    return fileContents;
  }
}
