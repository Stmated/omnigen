import * as Java from './cst/types';
import {ModifierType} from '@java/cst';
import {pascalCase} from 'change-case';
import {GenericDictionaryType, GenericPrimitiveKind, GenericPrimitiveType, GenericType, GenericTypeKind} from '@parse';
import {DEFAULT_JAVA_OPTIONS, JavaOptions, UnknownType} from '@java/JavaOptions';
import {VisitorFactoryManager} from '@visit/VisitorFactoryManager';
import {JavaVisitor} from '@java/visit/JavaVisitor';
import {CstRootNode} from '@cst/CstRootNode';
import {Naming} from '@parse/Naming';

interface FqnOptions {
  type: GenericType,
  withSuffix?: boolean;
  options?: JavaOptions;
  relativeTo?: string;
}

export type FqnArgs = GenericType | FqnOptions;

export class JavaUtil {

  /**
   * TODO: Return TypeName instead?
   */
  public static getFullyQualifiedName(args: FqnArgs): string {
    if ('type' in args) {
      return JavaUtil.getName(args);
    } else {
      return JavaUtil.getName({
        type: args
      });
    }
  }

  public static getRelativeName(type: GenericType, options: JavaOptions, relativeTo = options.package): string {
    return JavaUtil.getName({
      type: type,
      withSuffix: true,
      options: options,
      relativeTo: relativeTo
    });
  }

  public static getImportName(type: GenericType, options: JavaOptions): string {
    return JavaUtil.getName({
      type: type,
      options: options,
      withSuffix: false
    });
  }

  /**
   * Ugly. It should not be based on if relativeTo is set or not if this should return an FQN or just Name.
   */
  public static getName(args: FqnOptions): string {

    if (args.type.kind == GenericTypeKind.ARRAY) {
      if (args.withSuffix === false) {
        return JavaUtil.getName({...args, ...{type: args.type.of}});
      } else {
        return JavaUtil.getName({...args, ...{type: args.type.of}}) + '[]';
      }
    } else if (args.type.kind == GenericTypeKind.ARRAY_PROPERTIES_BY_POSITION || args.type.kind == GenericTypeKind.ARRAY_TYPES_BY_POSITION) {

      // TODO: This must be handled somehow. How?!?!?! Enough to introduce a common marker interface?

      // TODO: This must be handled somehow. How?!?!?! Enough to introduce a common marker interface?
      //        There must be a better of saying "this is an array with objects of this type in this order"
      //        We should be generating a helper class that wraps an array and gives us managed getters? Getter0() Getter1()???
      //        "commonDenominator" is a *REALLY* crappy way of handling it.

      let javaType: string;
      if (args.type.commonDenominator) {

        // Return the common denominator instead. That is this static type array's "representation" in the code.
        javaType = JavaUtil.getName({...args, ...{type: args.type.commonDenominator}});
      } else {
        javaType = this.getUnknownType(UnknownType.OBJECT);
      }

      if (args.withSuffix === false) {
        return javaType;
      } else {
        return `${javaType}[]`;
      }

    } else if (args.type.kind == GenericTypeKind.NULL) {
      // The type is "No Type. Void." It is not even really an Object.
      // But we return it as an Object in case we really need to display it somewhere.
      if (args.relativeTo) {
        return 'Object';
      } else {
        return 'java.lang.Object';
      }
    } else if (args.type.kind == GenericTypeKind.PRIMITIVE) {
      if (args.relativeTo) {
        return JavaUtil.getClassName(this.getPrimitiveKindName(args.type), args.withSuffix);
      } else {
        return JavaUtil.getCleanedFullyQualifiedName(this.getPrimitiveKindName(args.type), args.withSuffix);
      }
    } else if (args.type.kind == GenericTypeKind.UNKNOWN) {
      if (args.relativeTo) {
        return JavaUtil.getClassName(this.getUnknownType(args.options?.unknownType), args.withSuffix);
      } else {
        return JavaUtil.getCleanedFullyQualifiedName(this.getUnknownType(args.options?.unknownType), args.withSuffix);
      }
    } else if (args.type.kind == GenericTypeKind.DICTIONARY) {

      const mapClass = args.relativeTo ? `HashMap` : `java.lang.HashMap`;
      if (args.withSuffix === false) {
        return mapClass;
      } else {
        const keyString = JavaUtil.getName({...args, ...{type: args.type.keyType}});
        const valueString = JavaUtil.getName({...args, ...{type: args.type.valueType}});
        return `${mapClass}<${keyString}, ${valueString}>`;
      }

    } else if (args.type.kind == GenericTypeKind.REFERENCE) {

      if (args.relativeTo) {
        return JavaUtil.getClassName(args.type.fqn, args.withSuffix);
      }

      return JavaUtil.getCleanedFullyQualifiedName(args.type.fqn, !!args.withSuffix);
    } else {

      // Are we sure all of these will be in the same package?
      // TODO: Use some kind of "groupName" where the group can be the package? "model", "api", "server", etc?
      const name = Naming.safer(args.type);
      if (args.relativeTo == args.options?.package) {
        return name;
      } else {
        return (args.options ? `${args.options.package}.${name}` : name);
      }
    }
  }

  private static getPrimitiveKindName(type: GenericPrimitiveType): string {
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
  }

  private static getCleanedFullyQualifiedName(fqn: string, withSuffix = true): string {
    if (withSuffix) {
      return fqn;
    } else {
      const genericIdx = fqn.indexOf('<');
      if (genericIdx !== -1) {
        return fqn.substring(0, genericIdx);
      }
      const arrayIdx = fqn.indexOf('[');
      if (arrayIdx !== -1) {
        return fqn.substring(0, arrayIdx);
      }

      return fqn;
    }
  }

  public static getPackageName(fqn: string): string {
    const genericIdx = fqn.indexOf('<');
    if (genericIdx !== -1) {
      fqn = fqn.substring(0, genericIdx);
    }
    const idx = fqn.lastIndexOf('.');
    if (idx !== -1) {
      return fqn.substring(0, idx);
    }

    return fqn;
  }

  public static getClassName(fqn: string, withSuffix = true): string {
    // const cleanedName = JavaUtil.getCleanedFullyQualifiedName(fqn, withSuffix);

    const genericIdx = fqn.indexOf('<');
    if (!withSuffix) {
      if (genericIdx !== -1) {
        fqn = fqn.substring(0, genericIdx);
      }

      const idx = fqn.lastIndexOf('.');
      if (idx == -1) {
        return fqn;
      } else {
        return fqn.substring(idx + 1);
      }
    } else {

      let suffix = '';
      if (genericIdx !== -1) {
        suffix = fqn.substring(genericIdx);
        fqn = fqn.substring(0, genericIdx);
      }
      const idx = fqn.lastIndexOf('.');
      if (idx == -1) {
        return fqn + suffix;
      } else {
        return fqn.substring(idx + 1) + suffix;
      }
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
        return Naming.unwrap(a.name) == Naming.unwrap(b.name) ? a : undefined;
      }
    } else if (a.kind == GenericTypeKind.DICTIONARY) {
      if (b.kind == GenericTypeKind.DICTIONARY) {
        const commonKey = JavaUtil.getCommonDenominator(a.keyType, b.keyType);
        if (commonKey) {
          const commonValue = JavaUtil.getCommonDenominator(a.valueType, b.valueType);
          if (commonValue) {
            return <GenericDictionaryType>{
              name: () => `CommonBetween${Naming.safer(a)}And${Naming.safer(b)}`,
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
    const holder: { ref?: Java.ClassDeclaration } = {};
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
