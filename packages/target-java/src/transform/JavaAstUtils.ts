import {OmniInterfaceType, OmniType, OmniTypeKind} from '@omnigen/core';
import {JavaUtil} from '../util';
import * as Java from '../ast';

export class JavaAstUtils {

  public static addInterfaceProperties(type: OmniInterfaceType, body: Java.Block): void {

    if (type.of.kind == OmniTypeKind.OBJECT) {

      // Transform the object, but add no fields and only add the abstract method declaration (signature only)
      for (const property of type.of.properties) {
        body.children.push(
          new Java.AbstractMethodDeclaration(
            new Java.MethodDeclarationSignature(
              new Java.Identifier(JavaUtil.getGetterName(property.propertyName || property.name, property.type)),
              JavaAstUtils.createTypeNode(property.type, false)
            )
          )
        );
      }
    }
  }

  public static addGeneratedAnnotation(declaration: Java.AbstractObjectDeclaration): void {

    if (!declaration.annotations) {
      declaration.annotations = new Java.AnnotationList(...[]);
    }

    declaration.annotations.children.push(
      new Java.Annotation(
        new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'javax.annotation.Generated'}),
        new Java.AnnotationKeyValuePairList(
          new Java.AnnotationKeyValuePair(
            new Java.Identifier('value'),
            new Java.Literal('omnigen')
          ),
          new Java.AnnotationKeyValuePair(
            new Java.Identifier('date'),
            new Java.Literal(new Date().toISOString())
          )
        )
      )
    );
  }

  public static createTypeNode(type: OmniType, implementation?: boolean): Java.RegularType | Java.GenericType {

    if (type.kind == OmniTypeKind.DICTIONARY) {

      const mapClassOrInterface = implementation == false ? 'Map' : 'HashMap';
      const mapClass = `java.util.${mapClassOrInterface}`;
      const mapType = new Java.RegularType({ kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: mapClass});
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
