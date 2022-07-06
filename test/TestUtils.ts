import {OmniModel, OpenRpcParser, SchemaFile} from '../src';
import fs from 'fs/promises';

type KnownSchemaNames = 'openrpc';

export class TestUtils {

  static getKnownSchemaNames(): KnownSchemaNames[] {
    return ['openrpc'];
  }

  static async listExampleFileNames(type: KnownSchemaNames): Promise<string[]> {
    const dirPath = `./test/examples/${type}/`;
    return await fs.readdir(dirPath, {withFileTypes: true})
    .then(paths => {
      return paths.filter(it => it.isFile()).map(it => it.name);
    });
  }

  static async readExample(type: KnownSchemaNames, fileName: string): Promise<OmniModel> {

    const parser = new OpenRpcParser();
    const path = `./test/examples/${type}/${fileName}`;
    return await parser.parse(new SchemaFile(path, path));
  }
}
