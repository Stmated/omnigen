import * as Java from './cst/types';
import {pascalCase} from 'change-case';
import {GenericPrimitiveKind, GenericType, GenericTypeKind} from '@parse';
import {DEFAULT_JAVA_OPTIONS, JavaOptions, UnknownType} from '@java/JavaOptions';

export class JavaUtil {

  public static getFullyQualifiedName(type: GenericType, options?: JavaOptions): string {

    if (type.kind == GenericTypeKind.ARRAY) {
      return JavaUtil.getFullyQualifiedName(type.of, options) + '[]';
    } else if (type.kind == GenericTypeKind.NULL) {
      // The type is "No Type. Void." It is not even really an Object.
      // But we return it as an Object in case we really need to display it somewhere.
      return 'java.lang.Object';
    } else if (type.kind == GenericTypeKind.PRIMITIVE) {

      switch (type.primitiveKind) {
        case GenericPrimitiveKind.BOOL:
          return type.nullable ? 'java.lang.Boolean' : 'boolean';
        case GenericPrimitiveKind.VOID:
          return 'void';
        case GenericPrimitiveKind.CHAR:
          return type.nullable ? 'java.lang.Character' : 'char';
        case GenericPrimitiveKind.STRING:
          return 'String';
        case GenericPrimitiveKind.FLOAT:
          return type.nullable ? 'java.lang.Float' : 'float';
        case GenericPrimitiveKind.INTEGER:
          return type.nullable ? 'java.lang.Integer' : 'int';
        case GenericPrimitiveKind.INTEGER_SMALL:
          return type.nullable ? 'java.lang.Short' : 'short';
        case GenericPrimitiveKind.LONG:
          return type.nullable ? 'java.lang.Long' : 'long';
        case GenericPrimitiveKind.DECIMAL:
        case GenericPrimitiveKind.DOUBLE:
        case GenericPrimitiveKind.NUMBER:
          return type.nullable ? 'java.lang.Double' : 'double';
      }

    } else if (type.kind == GenericTypeKind.UNKNOWN) {

      const unknownType = options?.unknownType || DEFAULT_JAVA_OPTIONS.unknownType;
      switch (unknownType) {
        case UnknownType.JSON:
          return 'com.fasterxml.jackson.databind.JsonNode';
        case UnknownType.MAP:
          return 'java.lang.Map';
        case UnknownType.OBJECT:
          return 'java.lang.Object';
      }

    } else {
      return type.name;
    }
  }

  /**
   * Move to elsewhere, these should be based on the renderer and its settings?
   */
  public static getGetterName(baseName: string, type: GenericType): string {
    const capitalized = pascalCase(baseName);
    if (type.kind != GenericTypeKind.ARRAY) {
      if (type.kind == GenericTypeKind.PRIMITIVE && type.primitiveKind == GenericPrimitiveKind.BOOL && !type.nullable) {
        return `is${capitalized}`;
      }
    }

    return `get${capitalized}`;
  }

  public static getSetterName(identifier: Java.Identifier, type: GenericType): string {
    const baseName = identifier.value;
    const capitalized = pascalCase(baseName);
    return `set${capitalized}`;
  }
}
