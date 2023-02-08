import {
  AstNode,
  CompositionKind,
  LiteralValue,
  OmniCompositionType,
  OmniModel,
  OmniObjectType,
  OmniPotentialInterfaceType,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniProperty,
  OmniSubtypeCapableType,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  PackageOptions,
  RealOptions,
  UnknownKind,
} from '@omnigen/core';
import {DEFAULT_JAVA_OPTIONS, JavaOptions} from '../options';
import {JavaVisitor} from '../visit';
import * as Java from '../ast/index.js';
import {LoggerFactory} from '@omnigen/core-log';
import {Case, Naming, OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';

const logger = LoggerFactory.create(import.meta.url);

export type SuperTypePredicate = { (classType: JavaSuperTypeCapableType): boolean };

export type JavaPotentialClassType = OmniObjectType;

type JavaSubXOR = OmniCompositionType<JavaSubTypeCapableType | OmniPrimitiveType, CompositionKind.XOR>;

// NOTE: This might not be the best way to look at things. Is an XOR Composition really a subtype?
export type JavaSubTypeCapableType = OmniSubtypeCapableType | JavaSubXOR;

// FIX: IT MUST ONLY BE POSSIBLE TO HAVE COMPOSITION KIND XOR!

export type JavaSuperTypeCapableType =
  Exclude<OmniSuperTypeCapableType, OmniCompositionType<OmniSuperTypeCapableType, CompositionKind>>
  | OmniCompositionType<JavaSuperTypeCapableType, CompositionKind>;

export interface TypeNameInfo {
  packageName: string | undefined;
  className: string;
  outerTypeNames: string[];
}

interface FqnOptions {
  type: OmniType,
  options?: RealOptions<JavaOptions> | undefined;
  withSuffix?: boolean | undefined;
  withPackage?: boolean | undefined;
  withInner?: string[] | undefined;
  implementation?: boolean | undefined;
  boxed?: boolean | undefined;
  localNames?: Map<OmniType, TypeNameInfo> | undefined;
}

export type FqnArgs = OmniType | FqnOptions;

export class JavaUtil {

  /**
   * Re-usable Java Visitor, so we do not create a new one every time.
   */
  private static readonly _JAVA_VISITOR: JavaVisitor<void> = new JavaVisitor<void>();

  private static readonly _PATTERN_STARTS_WITH_NUMBER = new RegExp(/^[^a-zA-Z$_]/);
  private static readonly _PATTERN_INVALID_CHARS = new RegExp(/[^a-zA-Z0-9$_]/g);
  private static readonly _PATTERN_WITH_PREFIX = new RegExp(/^[_$]+/g);

  /**
   * TODO: Return TypeName instead?
   */
  public static getFullyQualifiedName(args: FqnArgs): string {
    if ('type' in args) {
      return JavaUtil.getName(args);
    } else {
      return JavaUtil.getName({
        type: args,
      });
    }
  }

  public static getClassNameForImport(
    type: OmniType,
    options: RealOptions<JavaOptions>,
    implementation: boolean | undefined,
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
      implementation: implementation,
    });
  }

  /**
   * TODO: This should be able to return undefined OR the input type needs to be more restricted
   *
   * @param type
   * @param options
   */
  public static getClassName(type: OmniType, options?: RealOptions<JavaOptions>): string {
    return JavaUtil.getName({
      type: type,
      options: options,
      withSuffix: false,
      withPackage: false,
      implementation: true,
    });
  }

  /**
   * TODO: This should be delayed until rendering. It is up to the rendering to render a type.
   *        Prime example being generics, which right now is hard-coded into strings here. Bad. Local type names are not respected.
   *
   * @param args
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
          javaType = this.getUnknownType(UnknownKind.OBJECT);
        }

        if (args.withSuffix === false) {
          return javaType;
        } else {
          return `${javaType}[]`;
        }
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
        const unknownType = args.type.unknownKind ?? args.options?.unknownType;
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
          const name = Naming.unwrap(args.type.name);
          return JavaUtil.getClassNameWithPackageName(args.type, name, args.options, args.withPackage);
        } else {
          const interfaceName = `I${JavaUtil.getName({...args, type: args.type.of, withPackage: false})}`;
          return JavaUtil.getClassNameWithPackageName(args.type, interfaceName, args.options, args.withPackage);
        }
      case OmniTypeKind.ENUM:
      case OmniTypeKind.OBJECT: {
        // Are we sure all of these will be in the same package?
        // TODO: Use some kind of "groupName" where the group can be the package? "model", "api", "server", etc?
        const name = Naming.unwrap(args.type.name);
        return JavaUtil.getClassNameWithPackageName(args.type, name, args.options, args.withPackage);
      }
      case OmniTypeKind.COMPOSITION: {

        // TODO: This is bad. The name should be set as a TypeName and evaluated once needed.
        const compositionName = JavaUtil.getCompositionClassName(args.type, args);
        return JavaUtil.getClassNameWithPackageName(args.type, compositionName, args.options, args.withPackage);
      }
      case OmniTypeKind.GENERIC_SOURCE:
        return JavaUtil.getName({...args, type: args.type.of});
      case OmniTypeKind.EXTERNAL_MODEL_REFERENCE: {

        // This is a reference to another model.
        // It might be possible that this model has another option that what was given to this method.
        if (args.type.name) {

          const name = Naming.unwrap(args.type.name);
          const commonOptions = args.type.model.options as RealOptions<JavaOptions> || args.options;
          return JavaUtil.getClassNameWithPackageName(args.type, name, commonOptions, args.withPackage);
        }

        if (args.type.model.options) {

          // TODO: This way of handling it is INCREDIBLY UGLY -- need a way to make this actually typesafe!
          const commonOptions = args.type.model.options as RealOptions<JavaOptions>;
          return JavaUtil.getName({...args, type: args.type.of, options: commonOptions});
        }

        return JavaUtil.getName({...args, type: args.type.of});
      }
    }
  }

  public static getClassNameWithPackageName(
    type: OmniType,
    typeName: string,
    options?: RealOptions<PackageOptions>,
    withPackage?: boolean,
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

  public static getPackageName(type: OmniType, typeName: string, options: RealOptions<PackageOptions>): string {

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

  private static getCompositionClassName<T extends OmniType>(type: OmniCompositionType<T, CompositionKind>, args: FqnOptions): string {

    if (type.name) {
      return Naming.unwrap(type.name);
    }

    let compositionTypes: OmniType[];
    let prefix = '';
    let delimiter: string;
    switch (type.compositionKind) {
      case CompositionKind.AND:
        compositionTypes = type.types;
        delimiter = 'And';
        break;
      case CompositionKind.OR:
        compositionTypes = type.types;
        delimiter = 'Or';
        break;
      case CompositionKind.XOR:
        compositionTypes = type.types;
        delimiter = 'XOr';
        break;
      case CompositionKind.NOT:
        compositionTypes = type.types;
        prefix = 'Not';
        delimiter = '';
        break;
    }

    const uniqueNames = new Set(compositionTypes.map(it => JavaUtil.getName({
      ...args,
      type: it,
      implementation: false,
      boxed: true,
    })));

    return `${prefix}${[...uniqueNames].join(delimiter)}`;
  }

  private static isPrimitiveBoxed(type: OmniPrimitiveType): boolean {

    if (type.primitiveKind == OmniPrimitiveKind.NULL || type.primitiveKind == OmniPrimitiveKind.VOID) {
      return false;
    }

    if (type.primitiveKind == OmniPrimitiveKind.STRING) {

      // If it's a string it's not boxed, it it always the same.
      return false;
    }

    return type.nullable == true;
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
      case OmniPrimitiveKind.NULL:
        return boxed ? 'java.lang.Object' : 'object';
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

  private static getUnknownType(unknownType: UnknownKind = DEFAULT_JAVA_OPTIONS.unknownType): string {
    switch (unknownType) {
      case UnknownKind.MUTABLE_OBJECT:
        return 'com.fasterxml.jackson.databind.JsonNode';
      case UnknownKind.MAP:
        return 'java.util.Map<String, Object>';
      case UnknownKind.OBJECT:
        return 'java.lang.Object';
      case UnknownKind.WILDCARD:
        return '?';
    }
  }

  /**
   * TODO: Move to elsewhere, these should be based on the renderer and its settings?
   */
  public static getGetterName(baseName: string, type: OmniType): string {
    const capitalized = Case.pascal(baseName);
    if (type.kind != OmniTypeKind.ARRAY) {
      if (type.kind == OmniTypeKind.PRIMITIVE && type.primitiveKind == OmniPrimitiveKind.BOOL && !type.nullable) {
        return `is${capitalized}`;
      }
    }

    return `get${capitalized}`;
  }

  public static getSetterName(baseName: string): string {
    const capitalized = Case.pascal(baseName);
    return `set${capitalized}`;
  }

  public static getMostCommonTypeInHierarchies(hierarchies: OmniType[][]): OmniType | undefined {

    if (hierarchies.length == 0) {
      return undefined;
    }

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

    return undefined;
  }

  public static getConstructorRequirements(
    root: AstNode,
    node: Java.AbstractObjectDeclaration<JavaSubTypeCapableType>,
    followSupertype = false,
  ): [Java.Field[], Java.ArgumentDeclaration[]] {

    const constructors: Java.ConstructorDeclaration[] = [];
    const fields: Java.Field[] = [];
    const setters: Java.FieldBackedSetter[] = [];

    const fieldVisitor = VisitorFactoryManager.create(JavaUtil._JAVA_VISITOR, {
      visitConstructor: n => {
        constructors.push(n);
      },
      visitObjectDeclaration: () => {
        // Do not go into any nested objects.
      },
      visitField: n => {
        fields.push(n);
      },
      visitFieldBackedSetter: n => {
        setters.push(n);
      },
    });

    node.body.visit(fieldVisitor);

    if (constructors.length > 0) {

      // This class already has a constructor, so we will trust that it is correct.
      // NOTE: In this future this could be improved into modifying the existing constructor as-needed.
      return [[], []];
    }

    const fieldsWithSetters = setters.map(setter => setter.field);
    const fieldsWithFinal = fields.filter(field => field.modifiers.children.some(m => m.type == Java.ModifierType.FINAL));
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

        const constructorVisitor = VisitorFactoryManager.create(JavaUtil._JAVA_VISITOR, {
          visitConstructor: node => {
            if (node.parameters) {
              supertypeArguments.push(...node.parameters.children);
            }
          },
        });

        extendedBy.visit(constructorVisitor);
      }

      return [
        immediateRequired,
        supertypeArguments,
      ];

    } else {
      return [
        immediateRequired,
        [],
      ];
    }
  }

  public static getClassDeclaration(root: AstNode, type: OmniType): Java.ClassDeclaration | undefined {

    // TODO: Need a way of making the visiting stop. Since right now we keep on looking here, which is... bad to say the least.
    const holder: { ref?: Java.ClassDeclaration } = {};
    root.visit(VisitorFactoryManager.create(JavaUtil._JAVA_VISITOR, {
      visitClassDeclaration: node => {
        if (node.type.omniType == type) {
          holder.ref = node;
        }
      },
      visitGenericClassDeclaration: node => {
        if (node.type.omniType == type) {
          holder.ref = node;
        } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
          if (node.type.omniType == type.source.of) {
            // Return the class declaration; which will be generic.
            // It is up to the calling code to map the generic arguments to real types.
            holder.ref = node;
          }
        }
      },
    }));

    return holder.ref;
  }

  public static getSpecifiedDefaultValue(type: OmniType): LiteralValue | undefined {
    if (type.kind == OmniTypeKind.PRIMITIVE && !type.literal) {
      return type.value;
    } else {
      return undefined;
    }
  }

  public static collectUnimplementedPropertiesFromInterfaces(type: OmniType): OmniProperty[] {

    const properties: OmniProperty[] = [];
    if (type.kind == OmniTypeKind.COMPOSITION && type.compositionKind == CompositionKind.XOR) {

      // Collecting properties from an XOR composition makes no sense, since we cannot know which needs implementing.
      return properties;
    }

    OmniUtil.visitTypesDepthFirst(type, ctx => {

      if (ctx.type.kind == OmniTypeKind.OBJECT) {
        if (ctx.depth > 0) {
          ctx.skip = true;
          return;
        }
      } else if (ctx.type.kind == OmniTypeKind.INTERFACE) {
        // The interface might be the interface of the calling type. Filter it out below.
        if (ctx.type.of != type) {
          properties.push(...OmniUtil.getPropertiesOf(ctx.type.of));
        }
      } else if (ctx.type.kind == OmniTypeKind.COMPOSITION && ctx.type.compositionKind == CompositionKind.XOR) {
        ctx.skip = true;
        return;
      }

      return undefined;
    });

    return properties;
  }

  public static getSafeIdentifierName(name: string): string {

    if (JavaUtil._PATTERN_STARTS_WITH_NUMBER.test(name)) {
      name = `_${name}`;
    }

    return name.replaceAll(JavaUtil._PATTERN_INVALID_CHARS, '_');
  }

  /**
   * Takes the given name and makes it safe and then makes it into a proper argument name.
   *
   * @param name
   */
  public static getPrettyArgumentName(name: string): string {

    const safeName = JavaUtil.getSafeIdentifierName(name);
    return Case.camel(safeName.replaceAll(JavaUtil._PATTERN_WITH_PREFIX, ''));
  }


  // TODO: MOVE ALL THE METHODS BELOW INTO A GENERAL CLASS THAT TAKES THE LANGUAGE FEATURES AS AN ARGUMENT
  //        BECAUSE IT SHOULD BE LIKELY THAT THE CODE IS VERY SIMILAR TO ALL DIFFERENT LANGUAGES!


  /**
   * Check if any of the supertypes of 'type' matches the predicate callback.
   *
   * @param model The current OmniModel
   * @param type The type to begin searching in
   * @param predicate Predicate which returns true if the object type matches, otherwise false.
   */
  public static superMatches(
    model: OmniModel,
    type: JavaSubTypeCapableType | undefined,
    predicate: SuperTypePredicate,
  ): boolean {

    const superType = JavaUtil.getSuperClassOfSubType(model, type);
    if (superType) {
      if (predicate(superType)) {
        return true;
      }

      const asSubType = JavaUtil.asSubType(superType);
      if (asSubType) {

        // The supertype is also a subtype which we can keep searching upwards in
        return JavaUtil.superMatches(model, asSubType, predicate);
      }
    }

    return false;
  }

  public static asSubType(type: OmniType): JavaSubTypeCapableType | undefined {

    if (type.kind == OmniTypeKind.COMPOSITION && type.compositionKind == CompositionKind.XOR) {

      // NOTE: This conversion is not necessarily true, the generics need to be improved to be trusted
      const isSubTypes = type.types.map(it => it.kind == OmniTypeKind.PRIMITIVE || !!JavaUtil.asSubType(it));
      if (isSubTypes.includes(false)) {

        // This might seem confusing, when you call "asSuperType" on a composition but get back undefined.
        // This method is supposed to be safe to call with anything though, but we log this occasion.
        logger.debug(`There is a non-subtype type inside composition ${OmniUtil.describe(type)}`);
        return undefined;
      }

      return type as JavaSubXOR;
    }

    return OmniUtil.asSubType(type);
  }

  public static asSuperType(type: OmniType | undefined): JavaSuperTypeCapableType | undefined {

    if (!type) {
      return undefined;
    }

    if (type.kind == OmniTypeKind.COMPOSITION) {

      const anyNotSuper = type.types.find(it => JavaUtil.asSuperType(it) === undefined);
      if (anyNotSuper) {
        throw new Error(`There was a non-supertype inside the composition ${OmniUtil.describe(type)}`);
      }

      return type as JavaSuperTypeCapableType;
    }

    // NOTE: Would be good to get rid of this cast? Why is it not recognized?
    const omniSuperType = OmniUtil.asSuperType(type);
    if (omniSuperType) {
      if (omniSuperType.kind == OmniTypeKind.COMPOSITION) {
        if (omniSuperType.compositionKind == CompositionKind.XOR) {
          return omniSuperType;
        }

        return undefined;
      }
    }

    return omniSuperType;
  }

  // public static getSubTypes(model: OmniModel, superType: OmniSuperTypeCapableType): [OmniSubtypeCapableType, number][] {
  //
  //   const result: [OmniSubtypeCapableType, number][] = [];
  //   const superTypes = OmniUtil.getFlattenedSuperTypes(superType);
  //
  //   OmniUtil.visitTypesDepthFirst(model, ctx => {
  //
  //     if (ctx.type.kind == OmniTypeKind.COMPOSITION) {
  //       return 'skip';
  //     }
  //
  //     if (ctx.type.kind == OmniTypeKind.OBJECT || ctx.type.kind == OmniTypeKind.INTERFACE || ctx.type.kind == OmniTypeKind.ENUM) {
  //
  //       const index = superTypes.indexOf(ctx.type);
  //       if (index != -1) {
  //         result.push([ctx.type, index]);
  //       } else {
  //         // Do anything here?
  //       }
  //
  //     } else {
  //
  //       // Skip any type that is not a subtype capable type.
  //       return 'skip';
  //     }
  //
  //     return undefined;
  //   });
  //
  //   return result;
  // }

  public static getFlattenedSuperTypes(type: JavaSuperTypeCapableType): JavaSuperTypeCapableType[] {

    if (type.kind == OmniTypeKind.COMPOSITION) {

      const superTypes: JavaSuperTypeCapableType[] = [];
      for (const t of type.types) {
        const asSuperType = JavaUtil.asSuperType(t);
        if (asSuperType) {
          superTypes.push(...JavaUtil.getFlattenedSuperTypes(asSuperType));
        }
      }

      return superTypes;
    } else {
      return [type];
    }
  }

  /**
   * See {@link JavaUtil#getSuperInterfacesOfSubType} for information about definition of objects and interfaces.
   */
  public static getSuperClassOfSubType(
    _model: OmniModel,
    subType: JavaSubTypeCapableType | undefined,
    returnUnwrapped = true,
  ): JavaSuperTypeCapableType | undefined {

    subType = OmniUtil.getUnwrappedType(subType);
    if (!subType || subType.kind == OmniTypeKind.COMPOSITION) {

      // The XOR composition class in Java does not actually extend anything.
      // Instead it solves things by becoming a manual mapping class with different getters.
      return undefined;
    }

    if (!subType.extendedBy) {
      return undefined;
    }

    const unwrapped = OmniUtil.getUnwrappedType(subType.extendedBy);

    if (unwrapped.kind == OmniTypeKind.COMPOSITION && unwrapped.compositionKind == CompositionKind.AND) {
      const flattened = JavaUtil.getFlattenedSuperTypes(unwrapped);
      if (flattened.length > 0) {
        const possibleObject = OmniUtil.getUnwrappedType(flattened[0]);
        if (possibleObject) {
          return possibleObject;
        }
      }
    }

    if (returnUnwrapped) {
      // This is a single type, and if it's an object, then it's something we inherit from.
      return JavaUtil.asSuperType(unwrapped);
    } else {
      return JavaUtil.asSuperType(subType.extendedBy);
    }
  }

  /**
   * On the Omni side of things we have two types: Object & Interface.
   *
   * Interface is when the source schema has specified the type as being an interface and not an implementation.
   *
   * Object is when the source schema has specified the shape of an object.
   *
   * But depending on the target language, that Object might be handled/rendered as an interface.
   * This is most apparent when dealing with JSONSchema to Java (or any language with single-inheritance).
   *
   * The schema might say "This object extends types A, B, C" but the language only allows inheriting from "A".
   * It then needs to handle B and C as interfaces and then try to live up to that contract on the subtype of A.
   */
  public static getSuperInterfacesOfSubType(_model: OmniModel, subType: JavaSubTypeCapableType): OmniPotentialInterfaceType[] {

    const interfaces: OmniPotentialInterfaceType[] = [];
    if (subType.kind == OmniTypeKind.COMPOSITION && subType.compositionKind == CompositionKind.XOR) {
      // The XOR composition class does in Java not actually implement anything.
      // Instead it solves things by becoming a manual mapping class with different getters.
      return interfaces;
    }

    // First we can find the specifically stated interfaces. This is not a very used concept.
    if (subType.kind == OmniTypeKind.OBJECT || subType.kind == OmniTypeKind.INTERFACE) {
      if (subType.extendedBy) {
        const flattened = OmniUtil.getFlattenedSuperTypes(subType.extendedBy);
        for (let i = 0; i < flattened.length; i++) {

          const superType = flattened[i];
          if (superType.kind == OmniTypeKind.INTERFACE) {
            interfaces.push(superType);
          } else if (superType.kind == OmniTypeKind.OBJECT && i > 0) {

            // If the supertype is an object, but it's not the first supertype, then it is an interface in Java.
            // It is up to transformers to order the supertypes in the best order for what should be class/interface.
            interfaces.push(superType);
          }
        }
      }
    }

    return interfaces;
  }

  // private static checkTypeAndCallback(pointer: JavaSuperTypeCapableType, callback: ObjectTypePredicate): boolean {
  //
  //   // TODO: Is this even correct?
  //   if (pointer.kind == OmniTypeKind.GENERIC_TARGET) {
  //     // TODO: Should allow more types than just object here, the generic can be pointing to something else.
  //     if (pointer.source.of.kind == OmniTypeKind.OBJECT && callback(pointer.source.of)) {
  //       return true;
  //     }
  //   } else if (pointer.kind == OmniTypeKind.COMPOSITION) {
  //     // ???
  //   } else if (pointer.kind == OmniTypeKind.ENUM) {
  //     // ???
  //   } else if (pointer.kind == OmniTypeKind.INTERFACE) {
  //     // ???
  //   } else if (pointer.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
  //     const unwrapped = OmniUtil.getUnwrappedType(pointer);
  //     if (!unwrapped) {
  //       throw new Error(`Something is wrong with the external model reference. It is not inheritable`);
  //     }
  //
  //     return JavaUtil.checkTypeAndCallback(unwrapped, callback);
  //
  //   } else {
  //
  //     if (callback(pointer)) {
  //       return true;
  //     }
  //   }
  //
  //   return false;
  // }

  /**
   * TypeGuard version of an otherwise expected 'isInterface' method.
   * Returns undefined if it does not have the potential of being an interface, otherwise the type casted.
   */
  public static getAsInterface(model: OmniModel, type: OmniType): OmniPotentialInterfaceType | undefined {

    const unwrapped = OmniUtil.getUnwrappedType(type);
    if (unwrapped.kind == OmniTypeKind.INTERFACE) {
      return unwrapped;
    }

    if (unwrapped.kind != OmniTypeKind.OBJECT) {
      return undefined;
    }

    // Now we need to figure out if this type is ever used as an interface in another type.

    const subTypeOfOurType = OmniUtil.visitTypesDepthFirst(model, ctx => {
      if ('extendedBy' in ctx.type && ctx.type.extendedBy) {

        const flattened = OmniUtil.getFlattenedSuperTypes(ctx.type.extendedBy);
        const usedAtIndex = flattened.indexOf(unwrapped);
        if (usedAtIndex > 0) {
          return ctx.type;
        }
      }

      return;
    });

    if (subTypeOfOurType) {

      const typeName = OmniUtil.describe(unwrapped);
      const subType = OmniUtil.describe(subTypeOfOurType);
      logger.debug(`Given type ${typeName} is used as interface in type ${subType}`);
      return unwrapped;
    }

    return undefined;
  }

  public static getAsClass(model: OmniModel, type: OmniType): JavaPotentialClassType | undefined {

    const unwrapped = OmniUtil.getUnwrappedType(type);
    if (unwrapped.kind != OmniTypeKind.OBJECT) { // && unwrapped.kind != OmniTypeKind.COMPOSITION) {

      return undefined;
    }

    if (model.types.includes(type)) {

      // The type is an external type and should always be output like a class (but might also become an interface).
      return unwrapped;
    }

    // This is a type that we need to investigate if it is ever used as a class somewhere else.
    // We do this by checking if any type uses 'type' as a first extension.
    return OmniUtil.visitTypesDepthFirst(model, ctx => {

      const uw = OmniUtil.getUnwrappedType(ctx.type);
      if (uw.kind == OmniTypeKind.ENUM || uw.kind == OmniTypeKind.INTERFACE) {
        return;
      }

      if ('extendedBy' in uw && uw.extendedBy) {
        if (uw.extendedBy == unwrapped) {
          return unwrapped;
        }

        if (uw.extendedBy.kind == OmniTypeKind.COMPOSITION && uw.extendedBy.compositionKind == CompositionKind.AND) {
          if (uw.extendedBy.types.length > 0) {
            if (uw.extendedBy.types[0] == unwrapped) {
              return unwrapped;
            }
          }
        }
      }

      return;
    });
  }

  public static getInterfaces(model: OmniModel): OmniPotentialInterfaceType[] {

    const interfaces: OmniPotentialInterfaceType[] = [];

    OmniUtil.visitTypesDepthFirst(model, ctx => {
      const asInterface = JavaUtil.getAsInterface(model, ctx.type);
      if (asInterface && !interfaces.includes(asInterface)) {
        interfaces.push(asInterface);

        // TODO: THIS IS WRONG! MOVE THIS INTO "getAsInterface"! It must be *central* to how it is decided!

        // If this is an interface, then we also need to add *all* supertypes as interfaces.
        // This is because an interface cannot inherit from a class, so all needs to be interfaces.
        for (const superClass of JavaUtil.getSuperClassHierarchy(model, asInterface)) {

          // getAsInterface is costly. So do a quicker check here.
          // The check might desync from the definition of an interface in getAsInterface, so keep heed here.
          if (superClass.kind == OmniTypeKind.OBJECT || superClass.kind == OmniTypeKind.INTERFACE) {
            if (!interfaces.includes(superClass)) {
              interfaces.push(superClass);
            }
          }
        }
      }
    });

    return interfaces;
  }

  public static getClasses(model: OmniModel): JavaPotentialClassType[] {

    const checked: OmniType[] = [];
    const classes: JavaPotentialClassType[] = [];

    OmniUtil.visitTypesDepthFirst(model, ctx => {
      if (checked.includes(ctx.type)) {
        return;
      }
      checked.push(ctx.type);

      const asClass = JavaUtil.getAsClass(model, ctx.type);
      if (asClass && !classes.includes(asClass)) {
        classes.push(asClass);
      }
    });

    return classes;
  }

  public static getConcreteClasses(model: OmniModel): JavaPotentialClassType[] {

    // TODO: It should be an option or not whether concrete vs abstract classes should exist, or all just be classes.
    const edgeTypes = OmniUtil.getAllExportableTypes(model).edge;

    const concreteClasses: JavaPotentialClassType[] = [];
    for (const edgeType of edgeTypes) {
      const asClass = JavaUtil.getAsClass(model, edgeType);
      if (asClass) {
        concreteClasses.push(asClass);
      }
    }

    return concreteClasses;
  }

  public static getSubTypeToSuperTypesMap(model: OmniModel): Map<OmniSubtypeCapableType, OmniSuperTypeCapableType[]> {
    return OmniUtil.getSubTypeToSuperTypesMap(model);
  }

  public static getSuperTypeToSubTypesMap(model: OmniModel): Map<OmniSuperTypeCapableType, OmniSubtypeCapableType[]> {
    return OmniUtil.getSuperTypeToSubTypesMap(model);
  }

  /**
   * Get the types that implement the given class.
   * There is a difference between implementing (interface) and extending (class)
   */
  public static getSubTypesOfInterface(model: OmniModel, interfaceType: OmniPotentialInterfaceType): OmniSubtypeCapableType[] {

    const subTypesOfInterface: OmniSubtypeCapableType[] = [];

    const superTypeToSubTypeMap = JavaUtil.getSuperTypeToSubTypesMap(model);
    const subTypes = superTypeToSubTypeMap.get(interfaceType);
    if (subTypes) {
      for (const subType of subTypes) {
        if (!subTypesOfInterface.includes(subType)) {
          subTypesOfInterface.push(subType);
        }
      }
    }

    return subTypesOfInterface;
  }

  public static getCommonSuperClasses(model: OmniModel, a: JavaSubTypeCapableType, b: JavaSubTypeCapableType): OmniType[] {

    const aAncestors = JavaUtil.getSuperClassHierarchy(model, a);
    const bAncestors = JavaUtil.getSuperClassHierarchy(model, b);

    return this.getCommon(aAncestors, bAncestors);
  }

  public static getSuperClassHierarchy(model: OmniModel, type: JavaSubTypeCapableType | undefined): OmniSuperTypeCapableType[] {

    const path: OmniSuperTypeCapableType[] = [];
    if (!type) {
      return path;
    }

    let pointer: JavaSubTypeCapableType | undefined = type;
    while (pointer) {

      const superClass = JavaUtil.getSuperClassOfSubType(model, pointer);
      if (superClass) {
        path.push(superClass);
        pointer = JavaUtil.asSubType(superClass);
      } else {
        break;
      }
    }

    return path;
  }

  private static getCommon<T>(a: T[], b: T[]): T[] {
    return a.filter(value => b.includes(value));
  }
}
