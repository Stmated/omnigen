import {camelCase, pascalCase} from 'change-case';
import {
  CompositionKind,
  OmniCompositionType,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniProperty,
  OmniType,
  OmniTypeKind,
  PrimitiveNullableKind,
  AstRootNode,
  Naming,
  OmniUtil,
  RealOptions,
  IPackageOptions,
  VisitorFactoryManager
} from '@omnigen/core';
import {DEFAULT_JAVA_OPTIONS, IJavaOptions, UnknownType} from '../options';
import {JavaVisitor} from '../visit';
import * as Java from '../ast';

export interface TypeNameInfo {
  packageName: string | undefined;
  className: string;
  outerTypeNames: string[];
}

interface FqnOptions {
  type: OmniType,
  options?: RealOptions<IJavaOptions>;
  withSuffix?: boolean;
  withPackage?: boolean;
  withInner?: string[];
  implementation?: boolean;
  boxed?: boolean;
  localNames?: Map<OmniType, TypeNameInfo>;
}

export type FqnArgs = OmniType | FqnOptions;

export class JavaUtil {

  /**
   * Re-usable Java Visitor, so we do not create a new one every time.
   */
  private static readonly _javaVisitor: JavaVisitor<void> = new JavaVisitor<void>();

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

  public static getClassNameForImport(
    type: OmniType,
    options: RealOptions<IJavaOptions>,
    implementation: boolean | undefined
  ): string | undefined {

    if (type.kind == OmniTypeKind.PRIMITIVE) {

      // Primitive types do not need to be imported.
      return undefined;
    }

    return JavaUtil.getName({
      type: type,
      options: options,
      withSuffix: false,
      withPackage: true,
      implementation: implementation
    });
  }

  /**
   * TODO: This should be able to return undefined OR the input type needs to be more restricted
   */
  public static getClassName(type: OmniType, options?: RealOptions<IJavaOptions>): string {
    return JavaUtil.getName({
      type: type,
      options: options,
      withSuffix: false,
      withPackage: false,
      implementation: true,
    })
  }

  /**
   * TODO: This should be delayed until rendering. It is up to the rendering to render a type.
   *        Prime example being generics, which right now is hard-coded into strings here. Bad. Local type names are not respected.
   */
  public static getName(args: FqnOptions): string {

    if (args.localNames) {

      // TODO: Ugly, this code is replicated elsewhere. Should look into making it generalized/centralized
      const localName = args.localNames.get(args.type);
      if (localName) {
        if (localName.outerTypeNames.length > 0) {
          return `${localName.outerTypeNames.join('.')}.${localName.className}`;
        } else {
          return localName.className;
        }
      }
    }

    switch (args.type.kind) {
      case OmniTypeKind.GENERIC_TARGET:
        // NOTE: This will not include the generics, only the actual type source name.
        return JavaUtil.getName({...args, type: args.type.source});
      case OmniTypeKind.GENERIC_SOURCE_IDENTIFIER:
        // The local name of a generic type is always just the generic type name.
        return args.type.placeholderName;
      case OmniTypeKind.GENERIC_TARGET_IDENTIFIER:
        return args.type.placeholderName || args.type.sourceIdentifier.placeholderName;
      case OmniTypeKind.ARRAY: {
        const arrayOf = JavaUtil.getName({...args, type: args.type.of});
        return arrayOf + (args.withSuffix === false ? '' : '[]');
      }
      case OmniTypeKind.ARRAY_TYPES_BY_POSITION:
      case OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION: {
        // TODO: This must be handled somehow. How?!?!?! Enough to introduce a common marker interface?

        // TODO: This must be handled somehow. How?!?!?! Enough to introduce a common marker interface?
        //        There must be a better of saying "this is an array with objects of this type in this order"
        //        We should be generating a helper class that wraps an array and gives us managed getters? Getter0() Getter1()???
        //        "commonDenominator" is a *REALLY* crappy way of handling it.

        let javaType: string;
        if (args.type.commonDenominator) {

          // Return the common denominator instead. That is this static type array's "representation" in the code.
          javaType = JavaUtil.getName({...args, type: args.type.commonDenominator});
        } else {
          javaType = this.getUnknownType(UnknownType.OBJECT);
        }

        if (args.withSuffix === false) {
          return javaType;
        } else {
          return `${javaType}[]`;
        }
      }
      case OmniTypeKind.NULL:
        // The type is "No Type. Void." It is not even really an Object.
        // But we return it as an Object in case we really need to display it somewhere.
        // TODO: Should this be Void? Especially when used as a generic?
        if (!args.withPackage) {
          return 'Object';
        } else {
          return 'java.lang.Object';
        }
      case OmniTypeKind.PRIMITIVE: {
        const isBoxed = args.boxed != undefined ? args.boxed : JavaUtil.isPrimitiveBoxed(args.type);
        const primitiveKindName = JavaUtil.getPrimitiveKindName(args.type.primitiveKind, isBoxed);
        // TODO: Make a central method that handles the relative names -- especially once multi-namespaces are added
        if (!args.withPackage) {
          return JavaUtil.cleanClassName(primitiveKindName, args.withSuffix);
        } else {
          return JavaUtil.getCleanedFullyQualifiedName(primitiveKindName, args.withSuffix);
        }
      }
      case OmniTypeKind.UNKNOWN: {
        const unknownType = args.type.isAny ? UnknownType.OBJECT : args.options?.unknownType;
        const unknownName = JavaUtil.getUnknownType(unknownType);
        if (!args.withPackage) {
          return JavaUtil.cleanClassName(unknownName, args.withSuffix);
        } else {
          return JavaUtil.getCleanedFullyQualifiedName(unknownName, args.withSuffix);
        }
      }
      case OmniTypeKind.DICTIONARY:
        throw new Error(`Not allowed to get the name of a map, instead render it using the renderer and generics`);
      case OmniTypeKind.HARDCODED_REFERENCE:
        if (!args.withPackage) {
          return JavaUtil.cleanClassName(args.type.fqn, args.withSuffix);
        } else {
          return JavaUtil.getCleanedFullyQualifiedName(args.type.fqn, !!args.withSuffix);
        }
      case OmniTypeKind.INTERFACE:
        if (args.type.name) {
          const name = Naming.safe(args.type.name);
          return JavaUtil.getClassNameWithPackageName(args.type, name, args.options, args.withPackage);
        } else {
          const interfaceName = `I${JavaUtil.getName({...args, type: args.type.of, withPackage: false})}`;
          return JavaUtil.getClassNameWithPackageName(args.type, interfaceName, args.options, args.withPackage);
        }
      case OmniTypeKind.ENUM:
      case OmniTypeKind.OBJECT: {
        // Are we sure all of these will be in the same package?
        // TODO: Use some kind of "groupName" where the group can be the package? "model", "api", "server", etc?
        const name = Naming.safe(args.type.name);
        return JavaUtil.getClassNameWithPackageName(args.type, name, args.options, args.withPackage);
      }
      case OmniTypeKind.COMPOSITION: {

        const compositionName = JavaUtil.getCompositionClassName(args.type, args);
        return JavaUtil.getClassNameWithPackageName(args.type, compositionName, args.options, args.withPackage);
      }
      case OmniTypeKind.GENERIC_SOURCE:
        return JavaUtil.getName({...args, type: args.type.of});
      case OmniTypeKind.EXTERNAL_MODEL_REFERENCE: {

        // This is a reference to another model.
        // It might be possible that this model has another option that what was given to this method.
        if (args.type.model.options) {

          // TODO: This way of handling it is INCREDIBLY UGLY -- need a way to make this actually typesafe!
          const commonOptions = args.type.model.options as RealOptions<IJavaOptions>;
          return JavaUtil.getName({...args, type: args.type.of, options: commonOptions});
        }

        return JavaUtil.getName({...args, type: args.type.of});
      }
    }
  }

  public static getClassNameWithPackageName(
    type: OmniType,
    typeName: string,
    options?: RealOptions<IPackageOptions>,
    withPackage?: boolean
  ): string {

    if (!withPackage) {
      // TODO: This is weird and hard to undertand, need to make it easier to get class names based on context
      return typeName;
    }

    const packageName = options ? JavaUtil.getPackageName(type, typeName, options) : undefined;
    if (packageName) {
      if (packageName && packageName.length > 0) {
        return `${packageName}.${typeName}`;
      }
    }

    return typeName;
  }

  public static getPackageName(type: OmniType, typeName: string, options: RealOptions<IPackageOptions>): string {

    return options.packageResolver
      ? options.packageResolver(type, typeName, options)
      : options.package;
  }

  public static buildFullyQualifiedName(packageName: string, outerTypeNames: string[], className: string): string {

    if (outerTypeNames.length > 0) {
      return `${packageName}.${outerTypeNames.join('.')}.${className}`;
    } else {
      return `${packageName}.${className}`;
    }
  }

  private static getCompositionClassName(type: OmniCompositionType, args: FqnOptions): string {

    if (type.name) {
      return Naming.safe(type.name);
    }

    let compositionTypes: OmniType[];
    let prefix = '';
    let delimiter: string;
    switch (type.compositionKind) {
      case CompositionKind.AND:
        compositionTypes = type.andTypes;
        delimiter = 'And';
        break;
      case CompositionKind.OR:
        compositionTypes = type.orTypes;
        delimiter = 'Or';
        break;
      case CompositionKind.XOR:
        compositionTypes = type.xorTypes;
        delimiter = 'XOr';
        break;
      case CompositionKind.NOT:
        compositionTypes = type.notTypes;
        prefix = 'Not';
        delimiter = '';
        break;
    }

    const uniqueNames = new Set(compositionTypes.map(it => JavaUtil.getName({
      ...args,
      type: it,
      implementation: false,
      boxed: true
    })));

    return `${prefix}${[...uniqueNames].join(delimiter)}`;
  }

  public static getPrimitiveTypeName(type: OmniPrimitiveType): string {

    // The primitive nullable kind might be NOT_NULLABLE_PRIMITIVE.
    // Then in the end it will probably be a completely other type, depending on the language.
    // In Java, we cannot use a primitive as a generic parameter, but we want to be able to say it cannot be null.
    return JavaUtil.getPrimitiveKindName(type.primitiveKind, JavaUtil.isPrimitiveBoxed(type));
  }

  private static isPrimitiveBoxed(type: OmniPrimitiveType): boolean {
    return (type.nullable !== undefined && type.nullable == PrimitiveNullableKind.NULLABLE);
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
        return boxed ? 'java.lang.Integer' : 'int';
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

  public static getPackageNameFromFqn(fqn: string): string {
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

  public static cleanClassName(fqn: string, withSuffix = true): string {

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
        return 'java.util.Map<String, Object>';
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

  public static getSetterName(baseName: string): string {
    const capitalized = pascalCase(baseName);
    return `set${capitalized}`;
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

  public static getConstructorRequirements(
    root: AstRootNode,
    node: Java.AbstractObjectDeclaration,
    followSupertype = false
  ): [Java.Field[], Java.ArgumentDeclaration[]] {

    const constructors: Java.ConstructorDeclaration[] = [];
    const fields: Java.Field[] = [];
    const setters: Java.FieldBackedSetter[] = [];

    const fieldVisitor = VisitorFactoryManager.create(JavaUtil._javaVisitor, {
      visitConstructor: (n) => {
        constructors.push(n);
      },
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

    if (constructors.length > 0) {

      // This class already has a constructor, so we will trust that it is correct.
      // NOTE: In this future this could be improved into modifying the existing constructor as-needed.
      return [[], []];
    }

    const fieldsWithSetters = setters.map(setter => setter.field);
    const fieldsWithFinal = fields.filter(field => field.modifiers.modifiers.some(m => m.type == Java.ModifierType.FINAL));
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

  public static getClassDeclaration(root: AstRootNode, type: OmniType): Java.ClassDeclaration | undefined {

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

  public static getExtendHierarchy(type: OmniType): OmniType[] {

    const path: OmniType[] = [];
    let pointer: OmniType | undefined = type;
    while (pointer = JavaUtil.getExtendType(pointer)) {
      path.push(pointer);
    }

    return path;
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

  public static toUnboxedPrimitiveType<T extends OmniPrimitiveType>(type: T): T | OmniPrimitiveType {
    if (type.kind == OmniTypeKind.PRIMITIVE && type.nullable == PrimitiveNullableKind.NULLABLE) {
      return {
        ...type,
        nullable: PrimitiveNullableKind.NOT_NULLABLE,
      };
    }

    return type;
  }

  public static collectUnimplementedPropertiesFromInterfaces(type: OmniType): OmniProperty[] {

    const properties: OmniProperty[] = [];
    if (type.kind == OmniTypeKind.COMPOSITION && type.compositionKind == CompositionKind.XOR) {

      // Collecting properties from an XOR composition makes no sense, since we cannot know which needs implementing.
      return properties;
    }

    OmniUtil.traverseTypes(type, (localType, depth) => {

      if (localType.kind == OmniTypeKind.OBJECT) {
        if (depth > 0) {
          return 'skip';
        }
      } else if (localType.kind == OmniTypeKind.INTERFACE) {
        // The interface might be the interface of the calling type. Filter it out below.
        if (localType.of != type) {
          properties.push(...OmniUtil.getPropertiesOf(localType.of));
        }
      } else if (localType.kind == OmniTypeKind.COMPOSITION && localType.compositionKind == CompositionKind.XOR) {
        return 'skip';
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