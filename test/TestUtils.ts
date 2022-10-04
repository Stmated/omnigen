import fs from 'fs/promises';
import AbstractNode from '../src/ast/AbstractNode';
import {VisitorFactoryManager} from '../src/visit/VisitorFactoryManager';
import {AstRootNode} from '../src/ast/AstRootNode';
import {VisitResult} from '../src/visit';
import {OmniModelTransformer} from '@parse/OmniModelTransformer';
import {CompressionOmniModelTransformer} from '@parse/general/CompressionOmniModelTransformer';
import {GenericsOmniModelTransformer} from '@parse/general/GenericsOmniModelTransformer';
import {InterfaceJavaModelTransformer} from '@parse/general/InterfaceJavaModelTransformer';
import {OptionsUtil} from '@options';
import {
  CompositionKind,
  OmniCompositionType,
  OmniInheritableType,
  OmniModelParserResult,
  OmniObjectType,
  OmniProperty,
  OmniPropertyOwner,
  OmniType,
  OmniTypeKind,
  SchemaFile,
  TypeName
} from '@parse';
import {
  IOpenRpcParserOptions,
  JSONRPC_OPTIONS_FALLBACK,
  OPENRPC_OPTIONS_CONVERTERS,
  OpenRpcParserBootstrapFactory
} from '@parse/openrpc';
import {IJavaOptions, JAVA_OPTIONS_CONVERTERS, JavaVisitor} from '@java';
import * as Java from '@java/ast';
import {Dereferencer} from '@util';
import {JSONSchema7} from 'json-schema';
import {JsonSchemaParser} from '@parse/jsonschema/JsonSchemaParser';

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
      new InterfaceJavaModelTransformer()
    ];

    const openRpcParserBootstrapFactory = new OpenRpcParserBootstrapFactory();
    const openRpcParserBootstrap = await openRpcParserBootstrapFactory.createParserBootstrap(schemaFile);
    const schemaIncomingOptions = openRpcParserBootstrap.getIncomingOptions<IJavaOptions>();
    const openRpcRealOptions = await OptionsUtil.updateOptions(
      openRpcOptions,
      schemaIncomingOptions,
      OPENRPC_OPTIONS_CONVERTERS,
      JSONRPC_OPTIONS_FALLBACK,
    );

    if (!openRpcRealOptions.jsonRpcErrorDataSchema && schemaIncomingOptions?.jsonRpcErrorDataSchema) {

      // TODO: How do we solve this properly? Feels ugly making exceptions for certain options like this.
      //        Have a sort of "post converters" that can take the whole options? Need to have a look.
      const errorSchema = schemaIncomingOptions?.jsonRpcErrorDataSchema;
      if (!('kind' in errorSchema)) {

        const dereferencer = await Dereferencer.create<JSONSchema7>('', '', errorSchema);
        const jsonSchemaParser = new JsonSchemaParser<JSONSchema7>(dereferencer, openRpcRealOptions); // Where do we get options from?
        const errorType = jsonSchemaParser.transformErrorDataSchemaToOmniType(dereferencer.getFirstRoot());

        openRpcRealOptions.jsonRpcErrorDataSchema = errorType;
      }
    }

    const openRpcParser = openRpcParserBootstrap.createParser(openRpcRealOptions);
    const parseResult = openRpcParser.parse();

    // NOTE: Would be good if this could be handled in some more central way, so it can never be missed.
    //        But I am unsure how and where that would be.
    parseResult.model.options = schemaIncomingOptions;

    const realJavaOptions = await OptionsUtil.updateOptions(javaOptions, schemaIncomingOptions, JAVA_OPTIONS_CONVERTERS);

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

  public static getMethod(node: AbstractNode, name: string): Java.MethodDeclaration {

    const visitor = VisitorFactoryManager.create(new JavaVisitor<Java.MethodDeclaration>(), {
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

  public static getCompilationUnits(root: AstRootNode): Java.CompilationUnit[] {

    const array: Java.CompilationUnit[] = [];
    const visitor = VisitorFactoryManager.create(new JavaVisitor(), {
      visitCompilationUnit: (node, visitor) => {
        array.push(node);
      }
    });

    root.visit(visitor);

    return array;
  }

  public static getCompilationUnit(root: AstRootNode, name: string): Java.CompilationUnit {

    const visitor = VisitorFactoryManager.create(new JavaVisitor<Java.CompilationUnit>(), {
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
