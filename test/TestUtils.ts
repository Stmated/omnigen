import {
  CompositionKind,
  OmniObjectType,
  OmniCompositionType,
  OmniProperty,
  OmniPropertyOwner,
  OmniType,
  OmniTypeKind,
  TypeName,
  OmniInheritableType,
  OpenRpcParserBootstrapFactory,
  SchemaFile,
  IOpenRpcParserOptions, OmniModelParserResult, OPENRPC_OPTIONS_CONVERTERS
} from '../src';
import fs from 'fs/promises';
import {
  MethodDeclaration,
  CompilationUnit,
  JavaVisitor,
  IJavaOptions,
  JAVA_OPTIONS_CONVERTERS
} from '../src/modules/java';
import AbstractNode from '../src/cst/AbstractNode';
import {VisitorFactoryManager} from '../src/visit/VisitorFactoryManager';
import {CstRootNode} from '../src/cst/CstRootNode';
import {VisitResult} from '../src/visit';
import {OmniModelTransformer} from '../src/parse/OmniModelTransformer';
import {CompressionOmniModelTransformer} from '../src/parse/general/CompressionOmniModelTransformer';
import {GenericsOmniModelTransformer} from '../src/parse/general/GenericsOmniModelTransformer';
import {InterfaceJavaCstTransformer} from '../src/parse/general/InterfaceJavaCstTransformer';
import {OptionsUtil} from '../src/options/OptionsUtil';
import {
  JSONRPC_OPTIONS_FALLBACK
} from '../src/parse/openrpc/JsonRpcOptions';

export type KnownSchemaNames = 'openrpc';

type OmniPropertyOrphan = Omit<OmniProperty, 'owner'> & Partial<Pick<OmniProperty, 'owner'>>;

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

  static async readExample(
    type: KnownSchemaNames,
    fileName: string,
    openRpcOptions: IOpenRpcParserOptions,
    javaOptions: IJavaOptions
  ): Promise<OmniModelParserResult<IJavaOptions>> {

    const schemaFile = new SchemaFile(
      `./test/examples/${type}/${fileName}`,
      `./test/examples/${type}/${fileName}`
    );

    const transformers: OmniModelTransformer<IJavaOptions>[] = [
      new CompressionOmniModelTransformer(),
      new GenericsOmniModelTransformer(),
      new InterfaceJavaCstTransformer()
    ];

    const openRpcParserBootstrapFactory = new OpenRpcParserBootstrapFactory();
    const openRpcParserBootstrap = await openRpcParserBootstrapFactory.createParserBootstrap(schemaFile);
    const schemaIncomingOptions = openRpcParserBootstrap.getIncomingOptions<IJavaOptions>();
    const openRpcRealOptions = OptionsUtil.updateOptions(
      openRpcOptions,
      schemaIncomingOptions,
      OPENRPC_OPTIONS_CONVERTERS,
      JSONRPC_OPTIONS_FALLBACK,
    );

    const openRpcParser = openRpcParserBootstrap.createParser(openRpcRealOptions);
    const parseResult = openRpcParser.parse();

    const realJavaOptions = OptionsUtil.updateOptions(javaOptions, schemaIncomingOptions, JAVA_OPTIONS_CONVERTERS);

    for (const transformer of transformers) {
      transformer.transformModel(parseResult.model, realJavaOptions);
    }

    return {
      model: parseResult.model,
      options: realJavaOptions
    };
  }

  public static obj(name: TypeName, extendedBy?: OmniInheritableType, properties?: OmniPropertyOrphan[]): OmniObjectType {
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
      kind: OmniTypeKind.COMPOSITION,
      compositionKind: CompositionKind.AND,
      andTypes: types,
    };
  }

  public static prop(name: string, type: OmniType, owner?: OmniPropertyOwner): OmniProperty | OmniPropertyOrphan {
    return {
      name: name,
      type: type,
      owner: owner
    };
  }

  public static getMethod(node: AbstractNode, name: string): MethodDeclaration {

    const visitor = VisitorFactoryManager.create(new JavaVisitor<MethodDeclaration>(), {
      visitMethodDeclaration: (node, visitor) => {
        if (node.signature.identifier.value == name) {
          return node;
        } else {
          return undefined;
        }
      }
    });

    const result = TestUtils.flatten(node.visit(visitor));
    if (!result) {
      throw new Error(`Could not find '${name}'`);
    }

    return result;
  }

  public static getCompilationUnits(root: CstRootNode): CompilationUnit[] {

    const array: CompilationUnit[] = [];
    const visitor = VisitorFactoryManager.create(new JavaVisitor(), {
      visitCompilationUnit: (node, visitor) => {
        array.push(node);
      }
    });

    root.visit(visitor);

    return array;
  }

  public static getCompilationUnit(root: CstRootNode, name: string): CompilationUnit {

    const visitor = VisitorFactoryManager.create(new JavaVisitor<CompilationUnit>(), {
      visitCompilationUnit: (node, visitor) => {
        if (node.object.name.value == name) {
          return node;
        } else {
          return undefined;
        }
      }
    });

    const result = TestUtils.flatten(root.visit(visitor));
    if (!result) {
      throw new Error(`Could not find '${name}'`);
    }

    return result;
  }

  public static flatten<T>(result: VisitResult<T>): T | undefined {

    if (!result) {
      return undefined;
    }

    if (Array.isArray(result)) {
      for (const item of result) {
        if (item) {
          const result = TestUtils.flatten(item);
          if (result) {
            return result;
          }
        }
      }

      return undefined;
    }

    return result;
  }
}
