import fs from 'fs/promises';
import {JavaTestUtils, JavaTestUtilsOptions} from './JavaTestUtils.ts';
import {OmniModelParserResult, PackageOptions, TargetOptions} from '@omnigen/core';
import {JavaBoot, JavaOptions} from '@omnigen/target-java';
import {ZodModelContext, ZodPackageOptionsContext, ZodTargetOptionsContext} from '@omnigen/core-plugin';
import {ZodCompilationUnitsContext} from '@omnigen/core-util';

export type KnownSchemaNames = 'openrpc';

/**
 * TODO: REMOVE THIS WHOLE THING! OR AT LEAST SERIOUSLY MINIMIZE IT! Use `Omnigen` base class instead!
 *        `Omnigen` needs to be made more dynamic/non-hardcoded first, then this class can just help with some basic options/args!
 */
export class OpenRpcTestUtils {

  static getKnownSchemaNames(): KnownSchemaNames[] {
    return ['openrpc'];
  }

  static async listExampleFileNames(type: KnownSchemaNames): Promise<string[]> {
    const dirPath = `../parser-${type}/examples/`;
    return fs.readdir(dirPath, {withFileTypes: true})
      .then(paths => {
        return paths.filter(it => it.isFile()).map(it => it.name);
      });
  }

  /**
   * TODO: Need a way to state what the "final" plugin should be
   *        since we should NOT render things here, we only care about the generated model
   */
  static async readExample(
    type: KnownSchemaNames,
    fileName: string,
    options: JavaTestUtilsOptions,
  ): Promise<OmniModelParserResult<JavaOptions & PackageOptions & TargetOptions>> {

    const result = await JavaTestUtils.getResultFromFilePath(
      `../parser-${type}/examples/${fileName}`,
      options,
      ZodModelContext
        .merge(JavaBoot.ZodJavaOptionsContext)
        .merge(ZodPackageOptionsContext)
        .merge(ZodTargetOptionsContext),
      ZodCompilationUnitsContext,
    );

    return {
      model: result.model,
      options: {
        ...result.javaOptions,
        ...result.packageOptions,
        ...result.targetOptions,
      },
    };
  }
}
