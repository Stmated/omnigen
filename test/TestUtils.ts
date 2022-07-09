import {
  CompositionKind,
  OmniObjectType,
  OmniCompositionType, Omnigen,
  OmniModel, OmniProperty, OmniPropertyOwner,
  OmniType,
  OmniTypeKind,
  OpenRpcParser, ParserManager,
  SchemaFile, TypeName
} from '../src';
import fs from 'fs/promises';
import {Naming} from '../src/parse/Naming';
import {DEFAULT_JAVA_OPTIONS} from '../src/modules/java';
import {IOptions} from '../src/options';

type KnownSchemaNames = 'openrpc';

type OmniPropertyOrphan = Omit<OmniProperty, 'owner'> & Partial<Pick<OmniProperty, 'owner'>>;

export class TestUtils {

  private static readonly _omnigen = new Omnigen();

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

  static async readExample(type: KnownSchemaNames, fileName: string, options: IOptions): Promise<OmniModel> {

    return TestUtils._omnigen.parse({
      input: `./test/examples/${type}/${fileName}`,
      fileName: `./test/examples/${type}/${fileName}`,
      languageOptions: options, // TODO: WRONG! We do NOT know that this is Java
    });
  }

  public static obj(name: TypeName, extendedBy?: OmniType, properties?: OmniPropertyOrphan[]): OmniObjectType {
    const omniClass: OmniObjectType = {
      name: name,
      kind: OmniTypeKind.OBJECT,
      extendedBy: extendedBy,
      additionalProperties: false,
      properties: [],
    };

    if (properties) {
      omniClass.properties = properties.map(it => {
        return {
          ...it,
          ...{
            owner: omniClass
          }
        };
      });
    }

    return omniClass;
  }

  public static and(...types: OmniType[]): OmniCompositionType {
    return {
      name: types.map(it => Naming.unwrap(it.name)).join('And'),
      kind: OmniTypeKind.COMPOSITION,
      compositionKind: CompositionKind.AND,
      types: types,
    };
  }

  public static prop(name: string, type: OmniType, owner?: OmniPropertyOwner): OmniProperty | OmniPropertyOrphan {
    return {
      name: name,
      type: type,
      owner: owner
    };
  }
}
