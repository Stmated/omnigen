import {
  CompositionKind,
  OmniCompositionAndType,
  OmniCompositionNotType,
  OmniCompositionOrType,
  OmniCompositionType,
  OmniCompositionXorType,
  OmniInterfaceOrObjectType,
  OmniModel,
  OmniObjectType,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniProperty,
  OmniSubTypeCapableType,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  PackageOptions,
  TypeName,
  UnknownKind,
} from '@omnigen/core';
import {DEFAULT_JAVA_OPTIONS, JavaOptions, SerializationLibrary} from '../options';
import * as Java from '../ast';
import {JavaAstRootNode} from '../ast';
import {LoggerFactory} from '@omnigen/core-log';
import {assertUnreachable, Case, Naming, OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
import {JavaAndTargetOptions} from '../transform';

const logger = LoggerFactory.create(import.meta.url);

export type SuperTypePredicate = { (classType: JavaSuperTypeCapableType): boolean };

export type JavaPotentialClassType = OmniObjectType;

// type JavaSubXOR = OmniCompositionXorType<JavaSubTypeCapableType | OmniPrimitiveType>;

// NOTE: This might not be the best way to look at things. Is an XOR Composition really a subtype?
export type JavaSubTypeCapableType =
  OmniSubTypeCapableType
  | OmniCompositionType<OmniSubTypeCapableType>;

// | JavaSubXOR;

// FIX: IT MUST ONLY BE POSSIBLE TO HAVE COMPOSITION KIND XOR!

export type JavaSuperTypeCapableType =
  Exclude<OmniSuperTypeCapableType, { kind: typeof OmniTypeKind.COMPOSITION }>
  | OmniCompositionAndType<JavaSuperTypeCapableType>
  | OmniCompositionOrType<JavaSuperTypeCapableType>
  | OmniCompositionXorType<JavaSuperTypeCapableType>
  | OmniCompositionNotType<JavaSuperTypeCapableType>;

export interface TypeNameInfo {
  packageName: string | undefined;
  className: string;
  outerTypes: Java.AbstractObjectDeclaration[];
}

interface FqnOptions {
  type: OmniType,
  options?: JavaAndTargetOptions | undefined;
  withSuffix?: boolean | undefined;
  withPackage?: boolean | undefined;
  withInner?: string[] | undefined;
  implementation?: boolean | undefined;
  boxed?: boolean | undefined;
  localNames?: Map<OmniType, TypeNameInfo> | undefined;
}

export type FqnArgs = OmniType | FqnOptions;

const JAVA_RESERVED_WORDS = [
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally',
  'float', 'for', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long',
  'native', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'short',
  'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
  'try', 'void', 'volatile', 'while', 'const', 'goto', 'true', 'false', 'null',
];

const JAVA_LANG_CLASSES = [
  'Appendable', 'AutoCloseable', 'CharSequence', 'Cloneable', 'Comparable', 'Iterable', 'Readable', 'Runnable', 'Boolean',
  'Byte', 'Character', 'Class', 'ClassLoader', 'ClassValue', 'Compiler', 'Double', 'Enum', 'Float', 'InheritableThreadLocal',
  'Integer', 'Long', 'Math', 'Number', 'Object', 'Package', 'Process', 'ProcessBuilder', 'Runtime', 'RuntimePermission',
  'SecurityManager', 'Short', 'StackTraceElement', 'StrictMath', 'String', 'StringBuffer', 'StringBuilder', 'System', 'Thread',
  'ThreadGroup', 'ThreadLocal', 'Throwable', 'Void',
];

export class JavaUtil {

  private static readonly _PATTERN_STARTS_WITH_ILLEGAL_IDENTIFIER_CHARS = new RegExp(/^[^a-zA-Z$_]/);
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
    options: JavaAndTargetOptions,
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
  public static getClassName(type: OmniType, options?: JavaAndTargetOptions): string {
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
   *        Prime example being generics and lower bound generics, which right now is hard-coded into strings here. Bad. Local type names are not respected.
   *
   * @param args
   * @deprecated Do not use. Delay name until rendering.
   */
  public static getName(args: FqnOptions): string {

    if (args.localNames) {

      // TODO: Ugly, this code is replicated elsewhere. Should look into making it generalized/centralized
      const localName = args.localNames.get(args.type);
      if (localName) {
        if (localName.outerTypes.length > 0) {
          return `${localName.outerTypes.map(it => it.name.value).join('.')}.${localName.className}`;
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
        return arrayOf + (args.withSuffix ? '[]' : '');
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
          javaType = this.getUnknownTypeString(UnknownKind.OBJECT, args.options);
        }

        if (args.withSuffix === false) {
          return javaType;
        } else {
          return `${javaType}[]`;
        }
      }
      case OmniTypeKind.PRIMITIVE: {
        const isBoxed = args.boxed != undefined ? args.boxed : JavaUtil.isPrimitiveBoxed(args.type);
        const primitiveKindName = JavaUtil.getPrimitiveKindName(args.type.primitiveKind, isBoxed, args.options || {preferNumberType: OmniPrimitiveKind.NUMBER});
        // TODO: Make a central method that handles the relative names -- especially once multi-namespaces are added
        if (!args.withPackage) {
          return JavaUtil.cleanClassName(primitiveKindName, args.withSuffix);
        } else {
          return JavaUtil.getCleanedFullyQualifiedName(primitiveKindName, args.withSuffix);
        }
      }
      case OmniTypeKind.UNKNOWN: {
        const unknownType = args.type.unknownKind ?? args.options?.unknownType;
        const unknownName = JavaUtil.getUnknownTypeString(unknownType, args.options);
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
      case OmniTypeKind.DECORATING:
        return JavaUtil.getName({...args, type: args.type.of});
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
        const unwrappedCompositionName = Naming.unwrap(compositionName);
        return JavaUtil.getClassNameWithPackageName(args.type, unwrappedCompositionName, args.options, args.withPackage);
      }
      case OmniTypeKind.GENERIC_SOURCE:
        return JavaUtil.getName({...args, type: args.type.of});
      case OmniTypeKind.EXTERNAL_MODEL_REFERENCE: {

        // This is a reference to another model.
        // It might be possible that this model has another option that what was given to this method.
        if (args.type.name) {

          const name = Naming.unwrap(args.type.name);
          const commonOptions = args.type.model.options as JavaAndTargetOptions || args.options;
          return JavaUtil.getClassNameWithPackageName(args.type, name, commonOptions, args.withPackage);
        }

        if (args.type.model.options) {

          // TODO: This way of handling it is INCREDIBLY UGLY -- need a way to make this actually typesafe!
          const commonOptions = args.type.model.options as JavaAndTargetOptions;
          return JavaUtil.getName({...args, type: args.type.of, options: commonOptions});
        }

        return JavaUtil.getName({...args, type: args.type.of});
      }
    }
  }

  public static getClassNameWithPackageName(
    type: OmniType,
    typeName: string,
    options?: PackageOptions,
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

  public static getPackageName(type: OmniType, typeName: string, options: PackageOptions): string {

    let packageName: string;
    if (options.packageResolver) {
      packageName = options.packageResolver(type, typeName, options);
    } else {
      packageName = options.package;
    }

    if (!packageName) {
      throw new Error(`Not allowed to have an empty package name for ${OmniUtil.describe(type)}`);
    }

    return packageName;
  }

  public static buildFullyQualifiedName(packageName: string, outerTypeNames: string[], className: string): string {

    const delimitedPackageName = packageName ? `${packageName}.` : packageName;

    if (outerTypeNames.length > 0) {
      return `${delimitedPackageName}${outerTypeNames.join('.')}.${className}`;
    } else {
      return `${delimitedPackageName}${className}`;
    }
  }

  private static getCompositionClassName<T extends OmniType>(type: OmniCompositionType<T>, args: FqnOptions): TypeName {

    if (type.name) {
      return Naming.unwrap(type.name);
    }

    let prefix: TypeName;
    if (type.compositionKind == CompositionKind.XOR) {
      prefix = ['UnionOf', 'ExclusiveUnionOf'];
    } else if (type.compositionKind == CompositionKind.OR) {
      prefix = 'UnionOf';
    } else if (type.compositionKind == CompositionKind.AND) {
      prefix = 'IntersectionOf';
    } else if (type.compositionKind == CompositionKind.NOT) {
      prefix = 'NegationOf';
    } else {
      assertUnreachable(type);
    }

    const uniqueNames = [...new Set(type.types.map(it => {

      if (it.kind == OmniTypeKind.PRIMITIVE) {
        switch (it.primitiveKind) {
          case OmniPrimitiveKind.NULL:
            return 'Null';
          case OmniPrimitiveKind.UNDEFINED:
            return 'Undefined';
        }
      } else if (it.kind == OmniTypeKind.ARRAY) {

        const itemName = JavaUtil.getName({...args, type: it.of, implementation: false, boxed: true});
        return `${itemName}Array`;
      }

      return JavaUtil.getName({...args, type: it, implementation: false, boxed: true});

    }))];

    let name: TypeName = {
      name: prefix,
    };

    for (let i = 0; i < uniqueNames.length; i++) {
      name = {
        prefix: name,
        name: uniqueNames[i],
      };
    }

    return name;
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

  public static getPrimitiveKindName(kind: OmniPrimitiveKind, boxed: boolean, javaOptions: Pick<JavaOptions, 'preferNumberType'>): string {

    if (kind == OmniPrimitiveKind.NUMBER && javaOptions.preferNumberType != kind) {
      kind = javaOptions.preferNumberType;
    }

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
        return boxed ? 'java.lang.Double' : 'double';
      case OmniPrimitiveKind.NUMBER:
        return boxed ? 'java.lang.Number' : 'double';
      case OmniPrimitiveKind.NULL:
      case OmniPrimitiveKind.UNDEFINED:
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

  /**
   * TODO: REMOVE! Should be handled by the later JavaRenderer, specific nodes for specific type
   */
  public static getUnknownTypeString(unknownKind: UnknownKind = DEFAULT_JAVA_OPTIONS.unknownType, options: JavaOptions | undefined): string {
    switch (unknownKind) {
      case UnknownKind.MUTABLE_OBJECT:
        if (!options || options.serializationLibrary == SerializationLibrary.JACKSON) {
          return 'com.fasterxml.jackson.databind.JsonNode';
        } else {
          // NOTE: Should probably be a map instead. But additionalProperties becomes `Map<String, Map<String, Object>>` which is a bit weird.
          return 'java.lang.Object';
        }
      case UnknownKind.MAP:
        return 'java.util.Map<String, Object>';
      case UnknownKind.OBJECT:
      case UnknownKind.ANY:
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

  public static getClassDeclaration(root: JavaAstRootNode, type: OmniType): Java.ClassDeclaration | undefined {

    // TODO: Need a way of making the visiting stop. Since right now we keep on looking here, which is... bad to say the least.
    const holder: { ref?: Java.ClassDeclaration } = {};

    const defaultVisitor = root.createVisitor();
    root.visit(VisitorFactoryManager.create(defaultVisitor, {
      visitClassDeclaration: node => {
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
      } else if (ctx.type.kind == OmniTypeKind.COMPOSITION) {
        if (ctx.type.compositionKind == CompositionKind.XOR) {
          ctx.skip = true;
          return;
        }
      }

      return undefined;
    });

    return properties;
  }

  public static getSafeIdentifierName(name: string): string {

    if (JavaUtil._PATTERN_STARTS_WITH_ILLEGAL_IDENTIFIER_CHARS.test(name)) {
      name = `_${name}`;
    }

    return name.replaceAll(JavaUtil._PATTERN_INVALID_CHARS, '_');
  }

  public static getGenericCompatibleType(type: OmniType): OmniType {
    return OmniUtil.toReferenceType(type);
  }

  /**
   * Takes the given name and makes it safe and then makes it into a proper argument name.
   *
   * @param name
   */
  public static getPrettyParameterName(name: string): string {

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

      if (JavaUtil.asSubType(superType)) {

        // The supertype is also a subtype which we can keep searching upwards in
        return JavaUtil.superMatches(model, superType, predicate);
      }
    }

    return false;
  }

  public static asSubType(type: OmniType): type is JavaSubTypeCapableType {
    return OmniUtil.asSubType(type);
  }

  public static asSuperType(type: OmniType | undefined, silent = true): type is JavaSuperTypeCapableType {
    return OmniUtil.asSuperType(type, silent);
  }

  public static getFlattenedSuperTypes(type: JavaSuperTypeCapableType): JavaSuperTypeCapableType[] {

    if (type.kind == OmniTypeKind.COMPOSITION) {

      const superTypes: JavaSuperTypeCapableType[] = [];
      for (const t of type.types) {
        if (JavaUtil.asSuperType(t)) {
          superTypes.push(...JavaUtil.getFlattenedSuperTypes(t));
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
    subType: OmniType | undefined,
    returnUnwrapped = true,
  ): JavaSuperTypeCapableType | undefined {

    subType = OmniUtil.getUnwrappedType(subType);
    if (!subType || subType.kind == OmniTypeKind.COMPOSITION) {

      // The XOR composition class in Java does not actually extend anything.
      // Instead it solves things by becoming a manual mapping class with different getters.
      return undefined;
    }

    if (!('extendedBy' in subType)) {
      return undefined;
    }

    if (!subType.extendedBy || subType.extendedBy.kind == OmniTypeKind.INTERFACE) {
      return undefined;
    }

    const extendedUnwrapped = OmniUtil.getUnwrappedType(subType.extendedBy);

    if (extendedUnwrapped.kind == OmniTypeKind.COMPOSITION && extendedUnwrapped.compositionKind == CompositionKind.AND) {
      const possible = JavaUtil.getSuperClassOfCompositionAnd(extendedUnwrapped);
      if (possible) {
        return possible;
      }
    }

    if (returnUnwrapped) {
      // This is a single type, and if it's an object, then it's something we inherit from.
      return JavaUtil.asSuperType(extendedUnwrapped) ? extendedUnwrapped : undefined;
    } else {
      return JavaUtil.asSuperType(subType.extendedBy) ? subType.extendedBy : undefined;
    }
  }

  public static getSuperClassOfCompositionAnd(composition: OmniCompositionType<OmniSuperTypeCapableType>) {

    if (composition.compositionKind != CompositionKind.AND) {
      throw new Error(`Only allowed to be called for 'AND' composition kind`);
    }

    const flattened = JavaUtil.getFlattenedSuperTypes(composition);
    if (flattened.length > 0) {
      const possibleObject = OmniUtil.getUnwrappedType(flattened[0]);
      if (possibleObject) {
        return possibleObject;
      }
    }
    return undefined;
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
  public static getSuperInterfacesOfSubType(_model: OmniModel, subType: OmniType): OmniInterfaceOrObjectType[] {

    const interfaces: OmniInterfaceOrObjectType[] = [];
    if (subType.kind == OmniTypeKind.COMPOSITION && subType.compositionKind == CompositionKind.XOR) {
      // The XOR composition class does in Java not actually implement anything.
      // Instead it solves things by becoming a manual mapping class with different getters.
      return interfaces;
    }

    // First we can find the specifically stated interfaces.
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

  /**
   * TypeGuard version of an otherwise expected 'isInterface' method.
   * Returns undefined if it does not have the potential of being an interface, otherwise the type casted.
   */
  // public static getAsInterface(model: OmniModel, type: OmniType): OmniInterfaceOrObjectType | undefined {
  //
  //   const unwrapped = OmniUtil.getUnwrappedType(type);
  //   if (unwrapped.kind == OmniTypeKind.INTERFACE) {
  //     return unwrapped;
  //   }
  //
  //   if (unwrapped.kind != OmniTypeKind.OBJECT) {
  //     return undefined;
  //   }
  //
  //   // Now we need to figure out if this type is ever used as an interface in another type.
  //
  //   const subTypeOfOurType = OmniUtil.visitTypesDepthFirst(model, ctx => {
  //     if ('extendedBy' in ctx.type && ctx.type.extendedBy) {
  //
  //       const flattened = OmniUtil.getFlattenedSuperTypes(ctx.type.extendedBy);
  //       const usedAtIndex = flattened.indexOf(unwrapped);
  //       if (usedAtIndex > 0) {
  //         return ctx.type;
  //       }
  //     }
  //
  //     return;
  //   });
  //
  //   if (subTypeOfOurType) {
  //
  //     const typeName = OmniUtil.describe(unwrapped);
  //     const subType = OmniUtil.describe(subTypeOfOurType);
  //     logger.debug(`Given type ${typeName} is used as interface in type ${subType}`);
  //     return unwrapped;
  //   }
  //
  //   return undefined;
  // }

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

  public static getSubTypeToSuperTypesMap(model: OmniModel): Map<OmniSubTypeCapableType, OmniSuperTypeCapableType[]> {
    return OmniUtil.getSubTypeToSuperTypesMap(model);
  }

  public static getSuperTypeToSubTypesMap(model: OmniModel): Map<OmniSuperTypeCapableType, OmniSubTypeCapableType[]> {
    return OmniUtil.getSuperTypeToSubTypesMap(model);
  }

  /**
   * Get the types that implement the given class.
   * There is a difference between implementing (interface) and extending (class)
   */
  public static getSubTypesOfInterface(model: OmniModel, interfaceType: OmniInterfaceOrObjectType): OmniSubTypeCapableType[] {

    const subTypesOfInterface = new Set<OmniSubTypeCapableType>();

    const superTypeToSubTypeMap = JavaUtil.getSuperTypeToSubTypesMap(model);
    const subTypes = superTypeToSubTypeMap.get(interfaceType);
    if (subTypes) {
      for (const subType of subTypes) {
        subTypesOfInterface.add(subType);
      }
    }

    return [...subTypesOfInterface];
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
        pointer = JavaUtil.asSubType(superClass) ? superClass : undefined;
      } else {
        break;
      }
    }

    return path;
  }

  private static getCommon<T>(a: T[], b: T[]): T[] {
    return a.filter(value => b.includes(value));
  }

  public static isReservedWord(word: string): boolean {
    return JAVA_RESERVED_WORDS.includes(word) || JAVA_LANG_CLASSES.includes(word);
  }

  public static getExtendsAndImplements(
    model: OmniModel,
    type: OmniType,
  ): [JavaSuperTypeCapableType | undefined, OmniInterfaceOrObjectType[]] {

    const typeExtends = JavaUtil.getSuperClassOfSubType(model, type, false);

    if (type.kind != OmniTypeKind.COMPOSITION) {
      return [typeExtends, JavaUtil.getSuperInterfacesOfSubType(model, type)];
    } else {
      return [typeExtends, []];
    }
  }
}
