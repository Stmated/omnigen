import * as Java from './cst/types';
import {pascalCase} from 'change-case';
import {GenericPrimitiveKind, GenericType, GenericTypeKind} from '@parse';

export class JavaUtil {
  // public static isPrimitive(type: Java.Type): boolean {
  //   return false;
  // }

  // public static isBoolean(type: Java.Type): boolean {
  //   return (type.fqn === 'boolean' || type.fqn === 'java.lang.Boolean');
  // }

  // public static getCapitalizedString(value: string): string {
  //   return value.charAt(0).toUpperCase() + value.slice(1);
  // }

  public static getFullyQualifiedName(type: GenericType): string {

    // TODO: This needs to be VERY improved.
    if (type.kind == GenericTypeKind.ARRAY) {
      return JavaUtil.getFullyQualifiedName(type.of) + '[]';
    } else {
      return type.name;
    }
  }

  /**
   * Move to elsewhere, these should be based on the renderer and its settings?
   */
  public static getGetterName(identifier: Java.Identifier, type: GenericType): string {
    const baseName = identifier.value;
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
