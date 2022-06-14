import * as Java from './cst/types';
import {pascalCase} from 'change-case';
import {GenericDictionaryType, GenericPrimitiveKind, GenericType, GenericTypeKind} from '@parse';
import {DEFAULT_JAVA_OPTIONS, JavaOptions, UnknownType} from '@java/JavaOptions';

export class JavaUtil {

  public static getFullyQualifiedName(type: GenericType, options?: JavaOptions): string {

    if (type.kind == GenericTypeKind.ARRAY) {
      return JavaUtil.getFullyQualifiedName(type.of, options) + '[]';
    } else if (type.kind == GenericTypeKind.ARRAY_STATIC) {

      // TODO: This must be handled somehow. How?!?!?! Enough to introduce a common marker interface?

      if (type.commonDenominator) {

        // Return the common denominator instead. That is this static type array's "representation" in the code.
        return JavaUtil.getFullyQualifiedName(type.commonDenominator, options) + "[]";
      } else {
        return this.getUnknownType(UnknownType.OBJECT) + "[]"; // options?.unknownType);
      }

      // if (Array.isArray(type.of)) {
      //   if (type.of.length == 1) {
      //     return JavaUtil.getFullyQualifiedName(type.of[0], options) + '[]';
      //   }
      //
      //   throw new Error(`Not allowed to get the type of a list of types`);
      // } else {

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
      return this.getUnknownType(options?.unknownType);
    } else if (type.kind == GenericTypeKind.DICTIONARY) {

      const keyString = JavaUtil.getFullyQualifiedName(type.keyType);
      const valueString = JavaUtil.getFullyQualifiedName(type.valueType);
      return `java.lang.HashMap<${keyString}, ${valueString}>`;

    } else if (type.kind == GenericTypeKind.REFERENCE) {
      return type.fqn;
    } else if (type.kind == GenericTypeKind.ENUM) {

      // TODO: This might need to be prefixed with the package name?
      return type.name;
    } else {

      // This is a generated type's name.
      // TODO: We might need to look into doing some work here, if it should be the FQN or relative path?
      // TODO: This might need to be prefixed with the package name?
      return type.name;
    }
  }

  private static getUnknownType(unknownType: UnknownType = DEFAULT_JAVA_OPTIONS.unknownType): string {
    switch (unknownType) {
      case UnknownType.JSON:
        return 'com.fasterxml.jackson.databind.JsonNode';
      case UnknownType.MAP:
        return 'java.lang.Map<String, Object>';
      case UnknownType.OBJECT:
        return 'java.lang.Object';
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

  public static getSetterName(baseName: string, type: GenericType): string {
    const capitalized = pascalCase(baseName);
    return `set${capitalized}`;
  }

  public static getCommonDenominator(...types: GenericType[]): GenericType | undefined {

    let common: GenericType | undefined = types[0];
    for (let i = 1; i < types.length; i++) {
      common = JavaUtil.getCommonDenominatorBetween(common, types[i]);
      if (!common) {
        return common;
      }
    }

    return common;
  }

  public static getCommonDenominatorBetween(a: GenericType, b: GenericType): GenericType | undefined {

    if (a == b) {
      return a;
    }

    if (a.kind == GenericTypeKind.PRIMITIVE) {
      if (b.kind == GenericTypeKind.PRIMITIVE) {
        if (a.primitiveKind == b.primitiveKind) {
          return a;
        }

        if (a.primitiveKind == GenericPrimitiveKind.INTEGER || a.primitiveKind == GenericPrimitiveKind.INTEGER_SMALL) {
          if (b.primitiveKind == GenericPrimitiveKind.LONG || b.primitiveKind == GenericPrimitiveKind.DOUBLE || b.primitiveKind == GenericPrimitiveKind.FLOAT || b.primitiveKind == GenericPrimitiveKind.DECIMAL) {
            return b;
          }
        } else if (a.primitiveKind == GenericPrimitiveKind.LONG) {
          if (b.primitiveKind == GenericPrimitiveKind.DOUBLE || b.primitiveKind == GenericPrimitiveKind.FLOAT || b.primitiveKind == GenericPrimitiveKind.DECIMAL) {
            return b;
          }
        } else if (a.primitiveKind == GenericPrimitiveKind.FLOAT) {
          if (b.primitiveKind == GenericPrimitiveKind.DOUBLE || b.primitiveKind == GenericPrimitiveKind.DECIMAL) {
            return b;
          }
        } else if (a.primitiveKind == GenericPrimitiveKind.DECIMAL) {
          if (b.primitiveKind == GenericPrimitiveKind.DOUBLE) {
            return b;
          }
        } else if (a.primitiveKind == GenericPrimitiveKind.NUMBER) {
          if (b.primitiveKind == GenericPrimitiveKind.INTEGER || b.primitiveKind == GenericPrimitiveKind.INTEGER_SMALL || b.primitiveKind == GenericPrimitiveKind.LONG || b.primitiveKind == GenericPrimitiveKind.DOUBLE || b.primitiveKind == GenericPrimitiveKind.FLOAT || b.primitiveKind == GenericPrimitiveKind.DECIMAL) {
            return b;
          }
        } else if (a.primitiveKind == GenericPrimitiveKind.CHAR) {
          if (b.primitiveKind == GenericPrimitiveKind.STRING) {
            return b;
          }
        }
      }
    } else if (a.kind == GenericTypeKind.REFERENCE) {
      if (b.kind == GenericTypeKind.REFERENCE) {
        return a.fqn === b.fqn ? a : undefined;
      }
    } else if (a.kind == GenericTypeKind.ENUM) {
      if (b.kind == GenericTypeKind.ENUM) {
        return a.name === b.name ? a : undefined;
      }
    } else if (a.kind == GenericTypeKind.DICTIONARY) {
      if (b.kind == GenericTypeKind.DICTIONARY) {
        const commonKey = JavaUtil.getCommonDenominator(a.keyType, b.keyType);
        if (commonKey) {
          const commonValue = JavaUtil.getCommonDenominator(a.valueType, b.valueType);
          if (commonValue) {
            return <GenericDictionaryType>{
              name: `CommonBetween${a.name}And${b.name}`,
              kind: GenericTypeKind.DICTIONARY,
              keyType: commonKey,
              valueType: commonValue,
            };
          }
        }
      }
    } else if (a.kind == GenericTypeKind.ARRAY) {

    } else if (a.kind == GenericTypeKind.UNKNOWN) {
      if (b.kind == GenericTypeKind.UNKNOWN) {
        return a;
      }
    } else if (a.kind == GenericTypeKind.NULL) {
      if (b.kind == GenericTypeKind.NULL) {
        return a;
      }
    } else if (a.kind == GenericTypeKind.ARRAY_STATIC) {
      if (b.kind == GenericTypeKind.ARRAY_STATIC) {
        if (a.of.length === b.of.length) {
          const commonTypes: GenericType[] = [];
          for (let i = 0; i < a.of.length; i++) {
            if (a.of[i].name !== b.of[i].name) {
              return undefined;
            }

            const commonType = JavaUtil.getCommonDenominator(a.of[i].type, b.of[i].type);
            if (!commonType) {
              return undefined;
            }

            commonTypes.push(commonType);
          }

          // TODO: Return something else here instead, which is actually the common denominators between the two
          return a;
        }
      }
    } else if (a.kind == GenericTypeKind.OBJECT) {

      // Is there ever *anything* we can do here?
    }

    return undefined;
  }
}
