import fs from 'fs/promises';
import {Util} from '@omnigen/core';

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
    const dirPath = Util.getPathFromRoot(`./packages/parser-${type}/examples/`);
    return fs.readdir(dirPath, {withFileTypes: true})
      .then(paths => {
        return paths.filter(it => it.isFile()).map(it => it.name);
      });
  }
}
