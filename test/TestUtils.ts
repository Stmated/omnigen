import {
  CompositionKind,
  OmniObjectType,
  OmniCompositionType, Omnigen,
  OmniModel, OmniProperty, OmniPropertyOwner,
  OmniType,
  OmniTypeKind,
  TypeName, OmniInheritableType
} from '../src';
import fs from 'fs/promises';
import {MethodDeclaration, CompilationUnit, JavaVisitor} from '../src/modules/java';
import {IOptions} from '../src/options';
import AbstractNode from '../src/cst/AbstractNode';
import {VisitorFactoryManager} from '../src/visit/VisitorFactoryManager';
import {CstRootNode} from '../src/cst/CstRootNode';
import {VisitResult} from '../src/visit';

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
      languageOptions: options, // TODO: WRONG! We do NOT know what kind of options this is! The generics are wonky!
    });
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
