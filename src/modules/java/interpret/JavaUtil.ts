import * as Java from '../cst/types';

export class JavaUtil {
  public static isPrimitive(type: Java.Type): boolean {
    return false;
  }

  public static isBoolean(type: Java.Type): boolean {
    return (type.fqn === 'boolean' || type.fqn === 'java.lang.Boolean');
  }

  public static getCapitalizedString(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  /**
   * Move to elsewhere, these should be based on the renderer and its settings?
   */
  public static getGetterName(identifier: Java.Identifier, type?: Java.Type): string {
    const baseName = identifier.value;
    const capitalized = JavaUtil.getCapitalizedString(baseName);
    if (type && JavaUtil.isBoolean(type) && JavaUtil.isPrimitive(type)) {
      return `is${capitalized}`;
    }

    return `get${capitalized}`;
  }

  public static getSetterName(identifier: Java.Identifier, type?: Java.Type): string {
    const baseName = identifier.value;
    const capitalized = JavaUtil.getCapitalizedString(baseName);
    return `set${capitalized}`;
  }
}
