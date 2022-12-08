import {
  AstRootNode,
  OmniPotentialInterfaceType,
  OmniType,
  OmniTypeKind,
  OmniUtil,
  VisitorFactoryManager,
} from '@omnigen/core';
import {JavaUtil} from '../util/index.js';
import * as Java from '../ast/index.js';
import {AbstractJavaAstTransformer} from './AbstractJavaAstTransformer.js';
import {LoggerFactory} from '@omnigen/core-log';
import {JavaVisitor} from '../visit/index.js';

const logger = LoggerFactory.create(import.meta.url);

export class JavaAstUtils {

  private static readonly _JAVA_VISITOR = new JavaVisitor<void>();

  public static addInterfaceProperties(type: OmniPotentialInterfaceType, body: Java.Block): void {

    const interfaceLikeTarget = (type.kind == OmniTypeKind.INTERFACE)
      ? type.of
      : type;

    if ('properties' in interfaceLikeTarget) {

      // Transform the object, but add no fields and only add the abstract method declaration (signature only)
      for (const property of interfaceLikeTarget.properties) {
        body.children.push(
          new Java.AbstractMethodDeclaration(
            new Java.MethodDeclarationSignature(
              new Java.Identifier(JavaUtil.getGetterName(property.propertyName || property.name, property.type)),
              JavaAstUtils.createTypeNode(property.type, false),
            ),
          ),
        );
      }
    }
  }

  public static createTypeNode(type: OmniType, implementation?: boolean): Java.RegularType | Java.GenericType {

    if (type.kind == OmniTypeKind.DICTIONARY) {

      const mapClassOrInterface = implementation == false ? 'Map' : 'HashMap';
      const mapClass = `java.util.${mapClassOrInterface}`;
      const mapType = new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: mapClass});
      const keyType = JavaAstUtils.createTypeNode(type.keyType, true);
      const valueType = JavaAstUtils.createTypeNode(type.valueType, true);

      return new Java.GenericType(mapType, [keyType, valueType]);

    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {

      const baseType = new Java.RegularType(type, implementation);

      // NOTE: In future versions of Java it might be possible to have primitive generic arguments.
      //        But for now we change all the primitive types into a reference type.
      const genericArguments = type.targetIdentifiers.map(it => JavaAstUtils.createTypeNode(OmniUtil.toReferenceType(it.type)));
      return new Java.GenericType(baseType, genericArguments);

    } else {
      return new Java.RegularType(type, implementation);
    }
  }

  public static getSuperClassToSubClassDeclarations(root: AstRootNode): Map<Java.ClassDeclaration, Java.ClassDeclaration[]> {

    const omniTypeToDeclaration = new Map<OmniType, Java.ClassDeclaration>();
    root.visit(VisitorFactoryManager.create(JavaAstUtils._JAVA_VISITOR, {

      visitEnumDeclaration: () => {
      },
      visitInterfaceDeclaration: () => {
      },
      visitMethodDeclaration: () => {
      },

      visitClassDeclaration: node => {
        omniTypeToDeclaration.set(node.type.omniType, node);
      },
    }));

    const superClassToSubClasses = new Map<Java.ClassDeclaration, Java.ClassDeclaration[]>();
    root.visit(VisitorFactoryManager.create(JavaAstUtils._JAVA_VISITOR, {

      visitEnumDeclaration: () => {
      },
      visitInterfaceDeclaration: () => {
      },
      visitMethodDeclaration: () => {
      },

      visitClassDeclaration: node => {

        if (node.extends) {
          const superType = node.extends.type.omniType;
          const superClass = omniTypeToDeclaration.get(superType);
          if (superClass) {

            const subClasses = (superClassToSubClasses.has(superClass)
              ? superClassToSubClasses
              : superClassToSubClasses.set(superClass, [])).get(superClass)!;

            subClasses.push(node);

          } else {
            logger.warn(`Could not find the class declaration of super type '${OmniUtil.describe(superType)}'`);
          }
        }
      },
    }));

    return superClassToSubClasses;
  }
}
