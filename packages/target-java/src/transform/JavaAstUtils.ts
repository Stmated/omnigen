import {OmniPotentialInterfaceType, OmniType, OmniTypeKind} from '@omnigen/core';
import {JavaUtil} from '../util/index.js';
import * as Java from '../ast/index.js';

export class JavaAstUtils {

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
      const genericArguments = type.targetIdentifiers.map(it => JavaAstUtils.createTypeNode(it.type));
      return new Java.GenericType(baseType, genericArguments);

    } else {
      return new Java.RegularType(type, implementation);
    }
  }
}
