import * as Java from './cst/types';
import {ModifierType} from '@java/cst';
import {pascalCase} from 'change-case';
import {OmniArrayType, OmniDictionaryType, OmniPrimitiveKind, OmniPrimitiveType, OmniType, OmniTypeKind} from '@parse';
import {DEFAULT_JAVA_OPTIONS, JavaOptions, UnknownType} from '@java/JavaOptions';
import {VisitorFactoryManager} from '@visit/VisitorFactoryManager';
import {JavaVisitor} from '@java/visit/JavaVisitor';
import {CstRootNode} from '@cst/CstRootNode';
import {Naming} from '@parse/Naming';

interface FqnOptions {
  type: OmniType,
  withSuffix?: boolean;
  options?: JavaOptions;
  relativeTo?: string;
}

export type FqnArgs = OmniType | FqnOptions;

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

  public static getRelativeName(type: OmniType, options: JavaOptions, relativeTo = options.package): string {
    return JavaUtil.getName({
      type: type,
      withSuffix: true,
      options: options,
      relativeTo: relativeTo
    });
  }

  public static getImportName(type: OmniType, options: JavaOptions): string {
    return JavaUtil.getName({
      type: type,
      options: options,
      withSuffix: false
    });
  }

  /**
   * Ugly. It should not be based on if relativeTo is set or not if this should return an FQN or just Name.
   * TODO: This should be delayed until rendering. It is up to the rendering to render a type. Should still be general.
   */
  public static getName(args: FqnOptions): string {

    if (args.type.kind == OmniTypeKind.GENERIC_TARGET) {

      // TODO: Somehow move this into the renderer instead -- it should be easy to change *any* rendering
      //        Right now this is locked to this part, and difficult to change
      const rawName = JavaUtil.getName({...args, ...{type: args.type.source}});;
      const genericTypes = args.type.targetIdentifiers.map(it => JavaUtil.getName({...args, ...{type: it.type}}));
      const genericTypeString = genericTypes.join(', ');
      return `${rawName}<${genericTypeString}>`;

    } else if (args.type.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER || args.type.kind == OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {

      // The local name of a generic type is always just the generic type name.
      return Naming.unwrap(args.type.name);
    } else if (args.type.kind == OmniTypeKind.ARRAY) {
      if (args.withSuffix === false) {
        return JavaUtil.getName({...args, ...{type: args.type.of}});
      } else {
        return JavaUtil.getName({...args, ...{type: args.type.of}}) + '[]';
      }
    } else if (args.type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION || args.type.kind == OmniTypeKind.ARRAY_TYPES_BY_POSITION) {

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

    } else if (args.type.kind == OmniTypeKind.NULL) {
      // The type is "No Type. Void." It is not even really an Object.
      // But we return it as an Object in case we really need to display it somewhere.
      // TODO: Should this be Void? Especially when used as a generic?
      if (args.relativeTo) {
        return 'Object';
      } else {
        return 'java.lang.Object';
      }
    } else if (args.type.kind == OmniTypeKind.PRIMITIVE) {
      if (args.relativeTo) {
        return JavaUtil.getClassName(this.getPrimitiveKindName(args.type), args.withSuffix);
      } else {
        return JavaUtil.getCleanedFullyQualifiedName(this.getPrimitiveKindName(args.type), args.withSuffix);
      }
    } else if (args.type.kind == OmniTypeKind.UNKNOWN) {
      if (args.relativeTo) {
        return JavaUtil.getClassName(this.getUnknownType(args.options?.unknownType), args.withSuffix);
      } else {
        return JavaUtil.getCleanedFullyQualifiedName(this.getUnknownType(args.options?.unknownType), args.withSuffix);
      }
    } else if (args.type.kind == OmniTypeKind.DICTIONARY) {

      const mapClass = args.relativeTo ? `HashMap` : `java.lang.HashMap`;
      if (args.withSuffix === false) {
        return mapClass;
      } else {
        const keyString = JavaUtil.getName({...args, ...{type: args.type.keyType}});
        const valueString = JavaUtil.getName({...args, ...{type: args.type.valueType}});
        return `${mapClass}<${keyString}, ${valueString}>`;
      }

    } else if (args.type.kind == OmniTypeKind.REFERENCE) {

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

  private static getPrimitiveKindName(type: OmniPrimitiveType): string {
    switch (type.primitiveKind) {
      case OmniPrimitiveKind.BOOL:
        return type.nullable ? 'java.lang.Boolean' : 'boolean';
      case OmniPrimitiveKind.VOID:
        return 'void';
      case OmniPrimitiveKind.CHAR:
        return type.nullable ? 'java.lang.Character' : 'char';
      case OmniPrimitiveKind.STRING:
        return 'String';
      case OmniPrimitiveKind.FLOAT:
        return type.nullable ? 'java.lang.Float' : 'float';
      case OmniPrimitiveKind.INTEGER:
        return type.nullable ? 'java.lang.Integer' : 'int';
      case OmniPrimitiveKind.INTEGER_SMALL:
        return type.nullable ? 'java.lang.Short' : 'short';
      case OmniPrimitiveKind.LONG:
        return type.nullable ? 'java.lang.Long' : 'long';
      case OmniPrimitiveKind.DECIMAL:
      case OmniPrimitiveKind.DOUBLE:
      case OmniPrimitiveKind.NUMBER:
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
  public static getGetterName(baseName: string, type: OmniType): string {
    const capitalized = pascalCase(baseName);
    if (type.kind != OmniTypeKind.ARRAY) {
      if (type.kind == OmniTypeKind.PRIMITIVE && type.primitiveKind == OmniPrimitiveKind.BOOL && !type.nullable) {
        return `is${capitalized}`;
      }
    }

    return `get${capitalized}`;
  }

  public static getSetterName(baseName: string, type: OmniType): string {
    const capitalized = pascalCase(baseName);
    return `set${capitalized}`;
  }

  public static getCommonDenominator(...types: OmniType[]): OmniType | undefined {

    let common: OmniType | undefined = types[0];
    for (let i = 1; i < types.length; i++) {
      common = JavaUtil.getCommonDenominatorBetween(common, types[i]);
      if (!common) {
        return undefined;
      }
    }

    return common;
  }

  /**
   * If the two types are in essence equal, 'a' is the one that is returned.
   * This can be used to check if 'a' and 'b' are the same (by value, not necessarily reference)
   *
   * @param a
   * @param b
   */
  public static getCommonDenominatorBetween(a: OmniType, b: OmniType): OmniType | undefined {

    if (a == b) {
      return a;
    }

    if (a.kind == OmniTypeKind.PRIMITIVE) {
      if (b.kind == OmniTypeKind.PRIMITIVE) {
        if (a.primitiveKind == b.primitiveKind) {
          return a;
        }

        if (a.primitiveKind == OmniPrimitiveKind.INTEGER || a.primitiveKind == OmniPrimitiveKind.INTEGER_SMALL) {
          if (b.primitiveKind == OmniPrimitiveKind.LONG || b.primitiveKind == OmniPrimitiveKind.DOUBLE || b.primitiveKind == OmniPrimitiveKind.FLOAT || b.primitiveKind == OmniPrimitiveKind.DECIMAL) {
            return b;
          }
        } else if (a.primitiveKind == OmniPrimitiveKind.LONG) {
          if (b.primitiveKind == OmniPrimitiveKind.DOUBLE || b.primitiveKind == OmniPrimitiveKind.FLOAT || b.primitiveKind == OmniPrimitiveKind.DECIMAL) {
            return b;
          }
        } else if (a.primitiveKind == OmniPrimitiveKind.FLOAT) {
          if (b.primitiveKind == OmniPrimitiveKind.DOUBLE || b.primitiveKind == OmniPrimitiveKind.DECIMAL) {
            return b;
          }
        } else if (a.primitiveKind == OmniPrimitiveKind.DECIMAL) {
          if (b.primitiveKind == OmniPrimitiveKind.DOUBLE) {
            return b;
          }
        } else if (a.primitiveKind == OmniPrimitiveKind.NUMBER) {
          if (b.primitiveKind == OmniPrimitiveKind.INTEGER || b.primitiveKind == OmniPrimitiveKind.INTEGER_SMALL || b.primitiveKind == OmniPrimitiveKind.LONG || b.primitiveKind == OmniPrimitiveKind.DOUBLE || b.primitiveKind == OmniPrimitiveKind.FLOAT || b.primitiveKind == OmniPrimitiveKind.DECIMAL) {
            return b;
          }
        } else if (a.primitiveKind == OmniPrimitiveKind.CHAR) {
          if (b.primitiveKind == OmniPrimitiveKind.STRING) {
            return b;
          }
        }
      }
    } else if (a.kind == OmniTypeKind.REFERENCE) {
      if (b.kind == OmniTypeKind.REFERENCE) {
        return a.fqn === b.fqn ? a : undefined;
      }
    } else if (a.kind == OmniTypeKind.ENUM) {
      if (b.kind == OmniTypeKind.ENUM) {
        return Naming.unwrap(a.name) == Naming.unwrap(b.name) ? a : undefined;
      }
    } else if (a.kind == OmniTypeKind.DICTIONARY) {
      if (b.kind == OmniTypeKind.DICTIONARY) {
        const commonKey = JavaUtil.getCommonDenominator(a.keyType, b.keyType);
        if (commonKey) {
          const commonValue = JavaUtil.getCommonDenominator(a.valueType, b.valueType);
          if (commonValue) {
            if (commonKey == a.keyType && commonValue == a.valueType) {
              return a;
            }

            return <OmniDictionaryType>{
              ...b,
              ...a,
              ...{
                name: () => `CommonBetween${Naming.safer(a)}And${Naming.safer(b)}`,
                kind: OmniTypeKind.DICTIONARY,
                keyType: commonKey,
                valueType: commonValue,
              }
            };
          }
        }
      }
    } else if (a.kind == OmniTypeKind.ARRAY) {
      if (b.kind == OmniTypeKind.ARRAY) {
        const common = JavaUtil.getCommonDenominator(a.of, b.of);
        if (common == a.of) {
          return a;
        }

        return <OmniArrayType>{
          ...b,
          ...a,
          ...{
            of: common
          }
        }
      }
    } else if (a.kind == OmniTypeKind.UNKNOWN) {
      if (b.kind == OmniTypeKind.UNKNOWN) {
        return a;
      }
    } else if (a.kind == OmniTypeKind.NULL) {
      if (b.kind == OmniTypeKind.NULL) {
        return a;
      }
    } else if (a.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      if (b.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
        if (a.properties.length === b.properties.length) {
          const commonTypes: OmniType[] = [];
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
    } else if (a.kind == OmniTypeKind.OBJECT) {
      if (b.kind == OmniTypeKind.OBJECT) {

        // If this fails, we should check the inheritance hierarchy.
        // If they have anything at all in common here, then we can use that.
        // TODO: We *maybe* could allow returning a composition here, but it's not really "legal" in Java.
        if (b.extendedBy) {

          // This will recursively search downwards in B's hierarchy.
          const common = JavaUtil.getCommonDenominator(a, b.extendedBy);
          if (common) {
            return common;
          }
        }

        if (a.extendedBy) {
          const common = JavaUtil.getCommonDenominator(a.extendedBy, b);
          if (common) {
            return common;
          }
        }

        // Is there ever anything better we can do here? Like check if signatures are matching.
        return {
          name: () => `${Naming.safer(a)}Or${Naming.safer(b)}`,
          kind: OmniTypeKind.UNKNOWN
        };
      }
    } else if (a.kind == OmniTypeKind.COMPOSITION) {

      // TODO: Do something here. There might be parts of 'a' and 'b' that are similar.
      // TODO: Should we then create a new composition type, or just return the first match?
    }

    return undefined;
  }

  /**
   * Re-usable Java Visitor, so we do not create a new one every time.
   */
  private static readonly _javaVisitor: JavaVisitor<void> = new JavaVisitor<void>();

  public static getFieldsRequiredInConstructor(
    root: CstRootNode,
    node: Java.AbstractObjectDeclaration,
    followSupertype = false
  ): [Java.Field[], Java.Field[]] {

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
      const extendedBy = JavaUtil.getClassDeclaration(root, node.extends.type.omniType);
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

  public static getClassDeclaration(root: CstRootNode, type: OmniType): Java.ClassDeclaration | undefined {

    // TODO: Need a way of making the visiting stop. Since right now we keep on looking here, which is... bad to say the least.
    const holder: { ref?: Java.ClassDeclaration } = {};
    root.visit(VisitorFactoryManager.create(JavaUtil._javaVisitor, {
      visitClassDeclaration: (node) => {
        if (node.type.omniType == type) {
          holder.ref = node;
        }
      }
    }));

    return holder.ref;
  }

  public static getExtendType(type: OmniType): OmniType | undefined {

    // TODO: Implement! Should have *one* if possible, the best common denominator between most types.
    if (type.kind == OmniTypeKind.OBJECT) {

      if (type.extendedBy) {

        // TODO: This is probably VERY wrong at the moment. Need to figure out which SINGLE type in probable composition to extend from
        if (type.extendedBy.kind == OmniTypeKind.OBJECT) {
          return type.extendedBy;
        } else if (type.extendedBy.kind == OmniTypeKind.COMPOSITION) {

          // TODO: Need to figure out which one it is we should actually *extend* from. It can only be one.
        }

        return type.extendedBy;
      }

      // TODO: How do we actually handle this in Java? Check other existing generator libraries for ideas
      //        Maybe there exists a dedicated library for analyzing JSONSchema -> Java conversions?
    }

    return undefined;
  }

  public static getImplementsTypes(type: OmniType): OmniType[] {

    // TODO: Implement! Should be any number of types that will be inherited from as interfaces.
    return [];
  }

  public static getExtendHierarchy(type: OmniType): OmniType[] {

    const path: OmniType[] = [];
    let pointer: OmniType | undefined = type;
    while (pointer = JavaUtil.getExtendType(pointer)) {
      path.push(pointer);
    }

    return path;
  }

  public static toGenericAllowedType(type: OmniType): OmniType {
    // Same thing for now, might change in the future.
    return JavaUtil.toNullableType(type);
  }

  public static isGenericAllowedType(type: OmniType): boolean {
    if (type.kind == OmniTypeKind.PRIMITIVE) {
      return type.nullable ?? false;
    }

    return true;
  }

  public static toNullableType(type: OmniType): OmniType {
    if (type.kind == OmniTypeKind.PRIMITIVE) {
      if (type.nullable) {
        return type;
      }

      const nullablePrimitive: OmniPrimitiveType = {
        ...type,
        ...{nullable: true}
      };

      return nullablePrimitive;
    }

    return type;
  }
}
