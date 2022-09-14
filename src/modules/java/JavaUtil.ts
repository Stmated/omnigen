import * as Java from './cst/JavaCstTypes';
import {ModifierType} from '@java/cst';
import {camelCase, pascalCase} from 'change-case';
import {
  OmniArrayType,
  OmniDictionaryType,
  OmniGenericTargetIdentifierType,
  OmniGenericTargetType,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniProperty,
  OmniType,
  OmniTypeKind,
  PrimitiveNullableKind
} from '@parse';
import {DEFAULT_JAVA_OPTIONS, JavaOptions, UnknownType} from '@java/JavaOptions';
import {VisitorFactoryManager} from '@visit/VisitorFactoryManager';
import {JavaVisitor} from '@java/visit/JavaVisitor';
import {CstRootNode} from '@cst/CstRootNode';
import {Naming} from '@parse/Naming';
import {OmniModelUtil} from '@parse/OmniModelUtil';

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
      const rawName = JavaUtil.getName({...args, ...{type: args.type.source}});
      const genericTypes = args.type.targetIdentifiers.map(it => JavaUtil.getName({...args, ...{type: it.type}}));
      const genericTypeString = genericTypes.join(', ');
      return `${rawName}<${genericTypeString}>`;

      // TODO: Fix the replacement of recursive generics -- look at JsonRpcRequest, it it pointing to the wrong type

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
        return JavaUtil.getClassName(this.getPrimitiveTypeName(args.type), args.withSuffix);
      } else {
        return JavaUtil.getCleanedFullyQualifiedName(this.getPrimitiveTypeName(args.type), args.withSuffix);
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

  public static getPrimitiveTypeName(type: OmniPrimitiveType): string {

    // The primitive nullable kind might be NOT_NULLABLE_PRIMITIVE.
    // Then in the end it will probably be a completely other type, depending on the language.
    // In Java, we cannot use a primitive as a generic parameter, but we want to be able to say it cannot be null.
    const boxed: boolean = (type.nullable !== undefined && type.nullable == PrimitiveNullableKind.NULLABLE);
    const primitiveKind = type.primitiveKind;
    return JavaUtil.getPrimitiveKindName(primitiveKind, boxed);
  }

  public static getPrimitiveKindName(kind: OmniPrimitiveKind, boxed: boolean): string {

    switch (kind) {
      case OmniPrimitiveKind.BOOL:
        return boxed ? 'java.lang.Boolean' : 'boolean';
      case OmniPrimitiveKind.VOID:
        return 'void';
      case OmniPrimitiveKind.CHAR:
        return boxed ? 'java.lang.Character' : 'char';
      case OmniPrimitiveKind.STRING:
        return 'String';
      case OmniPrimitiveKind.FLOAT:
        return boxed ? 'java.lang.Float' : 'float';
      case OmniPrimitiveKind.INTEGER:
        return boxed? 'java.lang.Integer' : 'int';
      case OmniPrimitiveKind.INTEGER_SMALL:
        return boxed ? 'java.lang.Short' : 'short';
      case OmniPrimitiveKind.LONG:
        return boxed ? 'java.lang.Long' : 'long';
      case OmniPrimitiveKind.DECIMAL:
      case OmniPrimitiveKind.DOUBLE:
      case OmniPrimitiveKind.NUMBER:
        return boxed ? 'java.lang.Double' : 'double';
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

  public static getMostCommonTypeInHierarchies(hierarchies: OmniType[][]): OmniType | undefined {

    if (hierarchies.length > 0) {

      const firstHierarchy = hierarchies[0];
      for (let typeIndex = firstHierarchy.length - 1; typeIndex >= 0; typeIndex--) {

        let common: OmniType | undefined = firstHierarchy[typeIndex];
        for (let n = 1; n < hierarchies.length; n++) {

          const indexOfInOtherHierarchy = hierarchies[n].indexOf(common);
          if (indexOfInOtherHierarchy == -1) {

            // Could not find this type in the other's hierarchy. Need to search deeper.
            common = undefined;
            break;
          }
        }

        if (common) {
          return common;
        }
      }
    }

    return undefined;
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
      // NOTE: Must nullable be equal? Or do we return the nullable type (if exists) as the common denominator?
      if (b.kind == OmniTypeKind.PRIMITIVE && a.nullable == b.nullable) {
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
    } else if (b.kind == OmniTypeKind.OBJECT || a.kind == OmniTypeKind.OBJECT) {
      if (b.kind == OmniTypeKind.OBJECT && b.extendedBy) {

        // This will recursively search downwards in B's hierarchy.
        const common = JavaUtil.getCommonDenominatorBetween(a, b.extendedBy);
        if (common) {
          return common;
        }
      }

      if (a.kind == OmniTypeKind.OBJECT && a.extendedBy) {
        const common = JavaUtil.getCommonDenominatorBetween(a.extendedBy, b);
        if (common) {
          return common;
        }
      }

      // Is there ever anything better we can do here? Like check if signatures are matching?
      return {
        name: () => `${Naming.safer(a)}Or${Naming.safer(b)}`,
        kind: OmniTypeKind.UNKNOWN
      };
    } else if (a.kind == OmniTypeKind.COMPOSITION) {

      // TODO: Do something here. There might be parts of 'a' and 'b' that are similar.
      // TODO: Should we then create a new composition type, or just return the first match?
    } else if (a.kind == OmniTypeKind.GENERIC_TARGET) {
      if (b.kind == OmniTypeKind.GENERIC_TARGET) {

        // TODO: Improve! Right now we might need to move the generic target types into external types.
        //        <T extends generated.omnigen.JsonRpcRequestParams<generated.omnigen.AccountLedgerRequestParamsData>>
        //        <T extends generated.omnigen.JsonRpcRequestParams<generated.omnigen.AccountPayoutParamsData>>
        //        =
        //        <TData extends generated.omnigen.AbstractToTrustlyRequestParamsData, T extends generated.omnigen.JsonRpcRequestParams<TData>>
        //        Then "params" should be of type T
        //        So if they differ, we need to explode the types
        //        Hopefully this will automatically be done recursively per level of inheritance so it's less complex to code!

        if (a.source == b.source) {

          const commonIdentifiers: OmniGenericTargetIdentifierType[] = [];

          for (const aIdentifier of a.targetIdentifiers) {
            for (const bIdentifier of b.targetIdentifiers) {
              if (aIdentifier.sourceIdentifier == bIdentifier.sourceIdentifier) {
                const commonIdentifierType = JavaUtil.getCommonDenominatorBetween(aIdentifier.type, bIdentifier.type);
                if (!commonIdentifierType) {
                  return undefined;
                }

                if (commonIdentifierType != aIdentifier.type) {

                  commonIdentifiers.push({
                    kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
                    type: commonIdentifierType,
                    name: (fn) => 'TData', // TODO: Figure out the name automatically based on... something
                    sourceIdentifier: {
                      // TODO: What? Is this even remotely correct?
                      kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
                      name: (fn) => 'TDataSource',
                      lowerBound: commonIdentifierType,
                    }
                  });
                }

                commonIdentifiers.push({
                  kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
                  type: commonIdentifierType,
                  name: commonIdentifierType.name,
                  sourceIdentifier: aIdentifier.sourceIdentifier,
                });
              }
            }
          }

          const commonGenericTarget: OmniGenericTargetType = {
            ...a,
            ...{
              targetIdentifiers: commonIdentifiers,
            }
          };

          return commonGenericTarget;
        }
      }
    }

    return undefined;
  }

  /**
   * Re-usable Java Visitor, so we do not create a new one every time.
   */
  private static readonly _javaVisitor: JavaVisitor<void> = new JavaVisitor<void>();

  public static getConstructorRequirements(
    root: CstRootNode,
    node: Java.AbstractObjectDeclaration,
    followSupertype = false
  ): [Java.Field[], Java.ArgumentDeclaration[]] {

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

      const supertypeArguments: Java.ArgumentDeclaration[] = [];
      const extendedBy = JavaUtil.getClassDeclaration(root, node.extends.type.omniType);
      if (extendedBy) {

        const constructorVisitor = VisitorFactoryManager.create(JavaUtil._javaVisitor, {
          visitConstructor: (node) => {
            if (node.parameters) {
              supertypeArguments.push(...node.parameters.children);
            }
          }
        });

        extendedBy.visit(constructorVisitor);
      }

      return [
        immediateRequired,
        supertypeArguments
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
      },
      visitGenericClassDeclaration: (node) => {
        if (node.type.omniType == type) {
          holder.ref = node;
        } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
          if (node.type.omniType == type.source.of) {
            // Return the class declaration; which will be generic.
            // It is up to the calling code to map the generic arguments to real types.
            holder.ref = node;
          }
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

  public static toGenericAllowedType(type: OmniType, wrap: boolean): OmniType {
    // Same thing for now, might change in the future.
    return JavaUtil.toNullableType(type, wrap);
  }

  public static isGenericAllowedType(type: OmniType): boolean {
    if (type.kind == OmniTypeKind.PRIMITIVE) {
      if (type.primitiveKind == OmniPrimitiveKind.STRING) {
        return true;
      }

      switch (type.nullable) {
        case PrimitiveNullableKind.NULLABLE:
        case PrimitiveNullableKind.NOT_NULLABLE_PRIMITIVE:
          return true;
        default:
          return false;
      }
    }

    return true;
  }

  public static isNullable(type: OmniType): boolean {
    // NOTE: If changed, make sure toNullableType is updated
    if (type.kind == OmniTypeKind.PRIMITIVE) {
      if (type.nullable || type.primitiveKind == OmniPrimitiveKind.STRING) {
        return true;
      }
    }

    return false;
  }

  public static toNullableType<T extends OmniType>(type: T, wrap: boolean): T | OmniPrimitiveType {
    // NOTE: If changed, make sure isNullable is updated
    if (type.kind == OmniTypeKind.PRIMITIVE) {
      if (type.nullable || type.primitiveKind == OmniPrimitiveKind.STRING) {
        return type;
      }

      const nullablePrimitive: OmniPrimitiveType = {
        ...type,
        ...{
          nullable: (wrap ? PrimitiveNullableKind.NOT_NULLABLE_PRIMITIVE : PrimitiveNullableKind.NULLABLE)
        }
      };

      return nullablePrimitive;
    }

    return type;
  }

  public static toUnboxedPrimitiveType<T extends OmniPrimitiveType>(type: T): T | OmniPrimitiveType {
    if (type.kind == OmniTypeKind.PRIMITIVE && type.nullable == PrimitiveNullableKind.NULLABLE) {
      return {
        ...type,
        ...{
          nullable: PrimitiveNullableKind.NOT_NULLABLE,
        }
      };
    }

    return type;
  }

  public static collectUnimplementedPropertiesFromInterfaces(type: OmniType): OmniProperty[] {

    const properties: OmniProperty[] = [];

    OmniModelUtil.traverseTypes(type, (localType, depth) => {

      if (localType.kind == OmniTypeKind.OBJECT) {
        if (depth > 0) {
          return 'skip';
        }
      } else if (localType.kind == OmniTypeKind.INTERFACE) {
        // The interface might be the interface of the calling type. Filter it out below.
        if (localType.of != type) {
          properties.push(...OmniModelUtil.getPropertiesOf(localType.of));
        }
      }

      return undefined;
    });

    return properties;
  }

  private static readonly PATTERN_STARTS_WITH_NUMBER = new RegExp(/^[^a-zA-Z$_]/);
  private static readonly PATTERN_INVALID_CHARS = new RegExp(/[^a-zA-Z0-9$_]/g);
  private static readonly PATTERN_WITH_PREFIX = new RegExp(/^[_$]+/g);

  public static getSafeIdentifierName(name: string): string {

    if (JavaUtil.PATTERN_STARTS_WITH_NUMBER.test(name)) {
      name = `_${name}`;
    }

    return name.replaceAll(JavaUtil.PATTERN_INVALID_CHARS, "_");
  }

  /**
   * Takes the given name and makes it safe and then makes it into a proper argument name.
   */
  public static getPrettyArgumentName(name: string): string {

    const safeName = JavaUtil.getSafeIdentifierName(name);
    return camelCase(safeName.replaceAll(JavaUtil.PATTERN_WITH_PREFIX, ""));
  }
}
