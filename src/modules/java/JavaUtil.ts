import * as Java from './cst/types';
import {ModifierType} from './cst/types';
import {pascalCase} from 'change-case';
import {GenericDictionaryType, GenericPrimitiveKind, GenericType, GenericTypeKind} from '@parse';
import {DEFAULT_JAVA_OPTIONS, JavaOptions, UnknownType} from '@java/JavaOptions';
import {VisitorFactoryManager} from '@visit/VisitorFactoryManager';
import {JavaVisitor} from '@java/visit/JavaVisitor';
import {CstRootNode} from '@cst/CstRootNode';

export class JavaUtil {

  public static getFullyQualifiedName(type: GenericType, options?: JavaOptions): string {

    if (type.kind == GenericTypeKind.ARRAY) {
      return JavaUtil.getFullyQualifiedName(type.of, options) + '[]';
    } else if (type.kind == GenericTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

      // TODO: This must be handled somehow. How?!?!?! Enough to introduce a common marker interface?

      if (type.commonDenominator) {

        // Return the common denominator instead. That is this static type array's "representation" in the code.
        return JavaUtil.getFullyQualifiedName(type.commonDenominator, options) + "[]";
      } else {
        return this.getUnknownType(UnknownType.OBJECT) + "[]"; // options?.unknownType);
      }

    } else if (type.kind == GenericTypeKind.ARRAY_TYPES_BY_POSITION) {

      // TODO: This must be handled somehow. How?!?!?! Enough to introduce a common marker interface?
      //        There must be a better of saying "this is an array with objects of this type in this order"
      //        We should be generating a helper class that wraps an array and gives us managed getters? Getter0() Getter1()???
      //        "commonDenominator" is a *REALLY* crappy way of handling it.

      if (type.commonDenominator) {

        // Return the common denominator instead. That is this static type array's "representation" in the code.
        return JavaUtil.getFullyQualifiedName(type.commonDenominator, options) + "[]";
      } else {
        return this.getUnknownType(UnknownType.OBJECT) + "[]";
      }

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
    } else if (a.kind == GenericTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      if (b.kind == GenericTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
        if (a.properties.length === b.properties.length) {
          const commonTypes: GenericType[] = [];
          for (let i = 0; i < a.properties.length; i++) {
            if (a.properties[i].name !== b.properties[i].name) {
              return undefined;
            }

            const commonType = JavaUtil.getCommonDenominator(a.properties[i].type, b.properties[i].type);
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

  /**
   * Re-usable Java Visitor, so we do not create a new one every time.
   */
  private static readonly _javaVisitor: JavaVisitor<void> = new JavaVisitor<void>();

  public static getFieldsRequiredInConstructor(root: CstRootNode, node: Java.AbstractObjectDeclaration, followSupertype = false): [Java.Field[], Java.Field[]] {

    const fields: Java.Field[] = [];
    const setters: Java.FieldBackedSetter[] = [];

    const fieldVisitor = VisitorFactoryManager.create(JavaUtil._javaVisitor, {
      visitObjectDeclaration: () => {
        // Do not go into any nested objects.
      },
      visitField: (n) => {
        fields.push(n);
      },
      visitFieldBackedSetter: (n) => {
        setters.push(n);
      }
    });

    node.body.visit(fieldVisitor);

    const fieldsWithSetters = setters.map(setter => setter.field);
    const fieldsWithFinal = fields.filter(field => field.modifiers.modifiers.some(m => m.type == ModifierType.FINAL));
    const fieldsWithoutSetters = fields.filter(field => !fieldsWithSetters.includes(field));
    const fieldsWithoutInitializer = fieldsWithoutSetters.filter(field => field.initializer == undefined);

    const immediateRequired = fields.filter(field => {

      if (fieldsWithSetters.includes(field) && fieldsWithoutInitializer.includes(field)) {
        return true;
      }

      if (fieldsWithFinal.includes(field) && fieldsWithoutInitializer.includes(field)) {
        return true;
      }

      return false;
    });

    if (followSupertype && node.extends) {

      // TODO: Find any class we extend, and then do this same thing to that class.

      const supertypeRequired: Java.Field[] = [];
      const extendedBy = JavaUtil.getClassDeclaration(root, node.extends.type.genericType);
      if (extendedBy) {
        supertypeRequired.push(...JavaUtil.getFieldsRequiredInConstructor(root, extendedBy, false)[0]);
      }

      return [
        immediateRequired,
        supertypeRequired
      ];

    } else {
      return [
        immediateRequired,
        [],
      ];
    }
  }

  public static getClassDeclaration(root: CstRootNode, type: GenericType): Java.ClassDeclaration | undefined {

    // TODO: Need a way of making the visiting stop. Since right now we keep on looking here, which is... bad to say the least.
    const holder: {ref?: Java.ClassDeclaration} = {};
    root.visit(VisitorFactoryManager.create(JavaUtil._javaVisitor, {
      visitClassDeclaration: (node) => {
        if (node.type.genericType == type) {
          holder.ref = node;
        }
      }
    }));

    return holder.ref;
  }

  public static getExtendType(type: GenericType): GenericType | undefined {

    // TODO: Implement! Should have *one* if possible, the best common denominator between most types.
    if (type.kind == GenericTypeKind.OBJECT) {

      if (type.extendedBy) {

        // TODO: This is probably VERY wrong at the moment. Need to figure out which SINGLE type in probable composition to extend from
        if (type.extendedBy.kind == GenericTypeKind.OBJECT) {
          return type.extendedBy;
        } else if (type.extendedBy.kind == GenericTypeKind.COMPOSITION) {

          // TODO: Need to figure out which one it is we should actually *extend* from. It can only be one.
        }

        return type.extendedBy;
      }

      // TODO: How do we actually handle this in Java? Check other existing generator libraries for ideas
      //        Maybe there exists a dedicated library for analyzing JSONSchema -> Java conversions?
    }

    return undefined;
  }

  public static getImplementsTypes(type: GenericType): GenericType[] {

    // TODO: Implement! Should be any number of types that will be inherited from as interfaces.
    return [];
  }

  public static getExtendHierarchy(type: GenericType): GenericType[] {

    const path: GenericType[] = [];
    let pointer: GenericType | undefined = type;
    while (pointer = JavaUtil.getExtendType(pointer)) {
      path.push(pointer);
    }

    return path;
  }
}
