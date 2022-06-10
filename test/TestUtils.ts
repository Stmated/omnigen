import {GenericModel, OpenRpcParser, SchemaFile} from '../src';
import fs from 'fs/promises';

type KnownSchemaNames = 'openrpc';

export class TestUtils {

  static getKnownSchemaNames(): KnownSchemaNames[] {
    return ['openrpc'];
  }

  static async listExampleFileNames(type: KnownSchemaNames): Promise<string[]> {
    const dirPath = `./test/examples/${type}/`;
    return await fs.readdir(dirPath);
  }

  static async readExample(type: KnownSchemaNames, fileName: string): Promise<GenericModel> {

    const parser = new OpenRpcParser();
    return await parser.parse(new SchemaFile(`./test/examples/${type}/${fileName}`));
  }
}
