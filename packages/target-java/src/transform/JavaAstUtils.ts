import {
  OmniDictionaryType, OmniGenericTargetType,
  OmniPotentialInterfaceType,
  OmniType,
  OmniTypeKind,
  OmniUtil,
  UnknownKind,
} from '@omnigen/core';
import {JavaUtil} from '../util/index.js';
import * as Java from '../ast/index.js';
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

  public static createTypeNode<T extends OmniType>(type: T, implementation?: boolean): Java.RegularType<T> | Java.GenericType {

    if (type.kind == OmniTypeKind.DICTIONARY) {
      return this.createMapTypeNode(type, implementation);
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return this.createGenericTargetTypeNode(type, implementation);
    } else {
      return new Java.RegularType<T>(type, implementation);
    }
  }

  private static createGenericTargetTypeNode<T extends OmniGenericTargetType>(
    type: T,
    implementation: boolean | undefined,
  ): Java.GenericType {

    const baseType = new Java.RegularType(type, implementation);

    // NOTE: In future versions of Java it might be possible to have primitive generic arguments.
    //        But for now we change all the primitive types into a reference type.
    const mappedGenericTargetArguments = type.targetIdentifiers.map(it => {

      let referenceType = OmniUtil.toReferenceType(it.type);
      if (referenceType.kind == OmniTypeKind.UNKNOWN && (!referenceType.unknownKind || referenceType.unknownKind == UnknownKind.OBJECT)) {

        // No set unknown type and Object, are probably better off as wildcard type ?
        referenceType = {
          ...referenceType,
          unknownKind: UnknownKind.WILDCARD,
        };
      }

      return JavaAstUtils.createTypeNode(referenceType);
    });

    return new Java.GenericType(baseType, mappedGenericTargetArguments);
  }

  private static createMapTypeNode(
    type: OmniDictionaryType,
    implementation: boolean | undefined,
  ): Java.GenericType {

    const mapClassOrInterface = implementation == false ? 'Map' : 'HashMap';
    const mapClass = `java.util.${mapClassOrInterface}`;
    const mapType = new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: mapClass});
    const keyType = JavaAstUtils.createTypeNode(type.keyType, true);
    const valueType = JavaAstUtils.createTypeNode(type.valueType, true);

    return new Java.GenericType(mapType, [keyType, valueType]);
  }
}
