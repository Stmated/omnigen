import {
  CommonDenominatorType,
  LiteralValue,
  OMNI_GENERIC_FEATURES,
  OmniAccessLevel,
  OmniArrayPropertiesByPositionType,
  OmniArrayType,
  OmniDecoratingType,
  OmniDictionaryType,
  OmniEnumType,
  OmniExternalModelReferenceType,
  OmniGenericTargetIdentifierType,
  OmniGenericTargetType,
  OmniHardcodedReferenceType,
  OmniInput,
  OmniKindComposition,
  OmniModel,
  OmniObjectType,
  OmniOptionallyNamedType,
  OmniOutput,
  OmniPrimitiveConstantValue,
  OmniPrimitiveKinds,
  OmniPrimitiveNull,
  OmniPrimitiveNumericType,
  OmniPrimitiveType,
  OmniProperty,
  OmniPropertyName,
  OmniPropertyNamePattern,
  OmniPropertyOwner,
  OmniSubTypeCapableType,
  OmniSuperGenericTypeCapableType,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  OmniTypeOf,
  PropertyDifference,
  SmartUnwrappedType,
  TargetFeatures,
  TypeDiffKind,
  TypeName,
  TypeOwner,
  UnknownKind,
} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';
import {PropertyUtil} from './PropertyUtil.ts';
import {BFSTraverseCallback, BFSTraverseContext, DFSTraverseCallback, OmniTypeVisitor} from './OmniTypeVisitor.ts';
import {Naming} from './Naming.ts';
import {util} from 'zod';
import {assertUnreachable, Case} from '../util';
import assertNever = util.assertNever;

const logger = LoggerFactory.create(import.meta.url);

export interface TypeCollection {

  named: OmniType[];
  all: OmniType[];
  edge: OmniType[];
}

type TargetIdentifierTuple = { a: OmniGenericTargetIdentifierType, b: OmniGenericTargetIdentifierType };

// NOTE: Perhaps the TraverseInput and TraverseParent should be able to be OmniModel (etc) as well?

export class OmniUtil {

  /**
   * TODO: Remove in favor of OmniModel visitor (make types into classes)
   */
  public static visitTypesDepthFirst<R>(
    input: TypeOwner | undefined,
    onDown?: DFSTraverseCallback<R>,
    onUp?: DFSTraverseCallback<R>,
    onlyOnce = true,
  ): R | undefined {
    return new OmniTypeVisitor().visitTypesDepthFirst(input, onDown, onUp, onlyOnce);
  }

  /**
   * TODO: Remove in favor of OmniModel visitor (make types into classes)
   */
  public static visitTypesBreadthFirst<R>(
    input: TypeOwner | TypeOwner[] | undefined,
    onDown: BFSTraverseCallback<R>,
    visitOnce = true,
  ): R | undefined {
    return new OmniTypeVisitor().visitTypesBreadthFirst(input, onDown, visitOnce);
  }

  /**
   * TODO: Remove in favor of OmniModel visitor (make types into classes)
   */
  public static getAllExportableTypes(model: OmniModel, refTypes?: OmniType[]): TypeCollection {

    // TODO: Should be an option to do a deep dive or a quick dive!
    const set = new Set<OmniType>();
    const setEdge = new Set<OmniType>();
    if (refTypes) {

      // TODO: Need to check if this whole thing can be skipped -- remove "refTypes", it is just confusing
      for (const refType of refTypes) {
        OmniUtil.visitTypesBreadthFirst(refType, ctx => {
          this.addExportableType(set, ctx, setEdge);
        });
      }
    }

    OmniUtil.visitTypesBreadthFirst(model, ctx => {
      this.addExportableType(set, ctx, setEdge);
    });

    return {
      all: [...set],
      edge: [...setEdge],
      named: [],
    };
  }

  private static addExportableType(set: Set<OmniType>, ctx: BFSTraverseContext, setEdge: Set<OmniType>): void {

    if (set.has(ctx.type)) {
      ctx.skip = true;
      return;
    }

    if (ctx.type.kind != OmniTypeKind.GENERIC_SOURCE) {
      if (ctx.parent && (ctx.parent.kind == OmniTypeKind.GENERIC_SOURCE || ctx.parent.kind == OmniTypeKind.GENERIC_TARGET)) {

        // The type that is inside the generic type is not itself exportable, only the generic class actually is.
        return;
      }
    }

    // if (ctx.type.kind == OmniTypeKind.DECORATING) {
    //
    //   // We do not add the decorating type itself
    //   return;
    // }

    set.add(ctx.type);
    if (ctx.typeDepth == 0) {
      setEdge.add(ctx.type);
    }
  }

  public static isGenericAllowedType(type: OmniType): boolean {
    if (OmniUtil.isPrimitive(type)) {

      // TODO: This is specific to some languages, and should not be inside OmniUtil
      if (type.kind == OmniTypeKind.STRING) {
        return true;
      }

      return !!type.nullable;
    }

    return true;
  }

  /**
   * Gets the actual type of the given type, giving back the first type that is not a hollow reference to another type.
   * The returned type might not be located in the same model as the given type.
   *
   * @param type what to unwrap
   */
  public static getUnwrappedType<T extends OmniType | undefined>(type: T): SmartUnwrappedType<T> {

    if (type) {
      if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
        return OmniUtil.getUnwrappedType(type.of) as SmartUnwrappedType<T>;
      } else if (type.kind == OmniTypeKind.DECORATING) {
        return OmniUtil.getUnwrappedType(type.of) as SmartUnwrappedType<T>;
      }
    }

    return type as SmartUnwrappedType<T>;
  }

  public static asSubType(type: OmniType | undefined): type is OmniSubTypeCapableType {

    if (!type) {
      return false;
    }

    if (type.kind == OmniTypeKind.OBJECT || type.kind == OmniTypeKind.ENUM || type.kind == OmniTypeKind.INTERFACE) {
      return true;
    }

    if (OmniUtil.isComposition(type)) {

      for (const child of type.types) {

        if (!OmniUtil.asSubType(child)) {

          logger.debug(`There is a non-supertype type (${OmniUtil.describe(child)}) inside composition '${OmniUtil.describe(type)}'`);
          return false;
        }
      }

      return true;
    }

    return false;
  }

  public static asGenericSuperType(type: OmniType | undefined): OmniSuperGenericTypeCapableType | undefined {

    if (!type) {
      return undefined;
    }

    if (type.kind == OmniTypeKind.OBJECT) {
      return type;
    }

    if (type.kind == OmniTypeKind.INTERFACE) {
      return type;
    }

    if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {

      const externalGenericSuper = OmniUtil.asGenericSuperType(type.of);
      if (externalGenericSuper) {
        return type as OmniExternalModelReferenceType<OmniSuperGenericTypeCapableType>;
      }
    }

    return undefined;
  }

  public static asSuperType(type: OmniType | undefined, silent = true): type is OmniSuperTypeCapableType {

    if (!type) {
      return false;
    }

    if (type.kind == OmniTypeKind.OBJECT
      || type.kind == OmniTypeKind.GENERIC_TARGET
      || type.kind == OmniTypeKind.ENUM
      || type.kind == OmniTypeKind.INTERFACE
      || type.kind == OmniTypeKind.HARDCODED_REFERENCE) {
      return true;
    }

    if (OmniUtil.isPrimitive(type) && !type.nullable && type.kind != OmniTypeKind.VOID && type.kind != OmniTypeKind.NULL) {
      return true;
    }

    if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return OmniUtil.asSuperType(type.of);
    }

    if (type.kind == OmniTypeKind.DECORATING) {
      return OmniUtil.asSuperType(type.of);
    }

    if (OmniUtil.isComposition(type)) {

      // This seems like an unnecessary operation to do, but cannot figure out a better way yet.
      for (const child of type.types) {
        const childSuperType = OmniUtil.asSuperType(child);
        if (!childSuperType) {

          // This might seem confusing, when you call "asSuperType" on a composition but get back undefined.
          // This method is supposed to be safe to call with anything though, but we log this occasion.
          const message = `There is a non-supertype type (${OmniUtil.describe(child)}) inside composition '${OmniUtil.describe(type)}'`;
          if (silent) {
            logger.debug(message);
            return false;
          } else {
            throw new Error(message);
          }
        }
      }

      return true;
    }

    return false;
  }

  public static isGenericSuperType(type: OmniSuperTypeCapableType): type is OmniSuperGenericTypeCapableType {

    if (type.kind == OmniTypeKind.GENERIC_TARGET
      || OmniUtil.isComposition(type)
      || type.kind == OmniTypeKind.ENUM
      || type.kind == OmniTypeKind.HARDCODED_REFERENCE
      || type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE
      || OmniUtil.isPrimitive(type)
    ) {

      // These cannot be made generic.
      // (maybe external model reference could in the future -- or it will be removed in favor of normalizing all referenced documents, and remove the type kind)
      return false;
    }

    return true;
  }

  /**
   * Not recursive. WARNING: Returns actual properties array reference, so do not modify it (unless that is what you want).
   *
   * @param type
   */
  public static getPropertiesOf(type: OmniType): OmniProperty[] {

    if (type.kind == OmniTypeKind.OBJECT) {
      return type.properties;
    }

    if (type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

      // This could quickly become very wonky if the properties are simply added to an interface?
      // Or is this handled by some other code, to convert it properly with index to the correct setter/constructor?
      return type.properties;
    }

    return [];
  }

  public static getTypesThatInheritFrom(model: OmniModel, type: OmniType): OmniType[] {

    const types: OmniType[] = [];

    // TODO: Make a visitor version of getAllExportableTypes? Less useless memory consumption.
    const exportableTypes = OmniUtil.getAllExportableTypes(model);

    // TODO: getAllExportableTypes should already include all model.types???
    const allTypes = new Set(exportableTypes.all.concat(model.types));

    for (const localType of allTypes) {
      if (localType.kind == OmniTypeKind.OBJECT) {
        if (localType.extendedBy == type) {
          types.push(localType);
        }
      }
    }

    return types;
  }

  public static getFlattenedSuperTypes(type: OmniSuperTypeCapableType): OmniSuperTypeCapableType[] {

    if (OmniUtil.isComposition(type)) {

      if (type.kind == OmniTypeKind.INTERSECTION) {
        return type.types.flatMap(it => {
          return OmniUtil.getFlattenedSuperTypes(it);
        });
      } else {

        // Are there other composition kinds that can be allowed as a list of 'extends' and 'implements'?
        return [];
      }

    } else {
      return [type];
    }
  }

  public static getSuperTypes(_model: OmniModel, type: OmniSubTypeCapableType | undefined): OmniSuperTypeCapableType[] {

    if (type) {
      const unwrapped = OmniUtil.getUnwrappedType(type);
      if (OmniUtil.isComposition(unwrapped)) {
        // if (unwrapped.kind === OmniTypeKind.INTERSECTION) {
        //   unwrapped.types;
        // }
        //
        // return [unwrapped];
        return [];
      }

      if (OmniUtil.isComposition(unwrapped.extendedBy)) {
        if (unwrapped.extendedBy.kind === OmniTypeKind.INTERSECTION) {
          return unwrapped.extendedBy.types;
        }
      } else if (unwrapped.extendedBy) {
        return [unwrapped.extendedBy];
      }
    }

    return [];
  }

  /**
   * Heavy operation, use sparingly
   */
  public static getSubTypeToSuperTypesMap(model: OmniModel): Map<OmniSubTypeCapableType, OmniSuperTypeCapableType[]> {

    const map = new Map<OmniSubTypeCapableType, OmniSuperTypeCapableType[]>();
    OmniUtil.visitTypesDepthFirst(model, ctx => {
      if (!OmniUtil.asSubType(ctx.type)) {
        return;
      }

      const subType = OmniUtil.getUnwrappedType(ctx.type);
      if (!subType) {
        return;
      }

      if (OmniUtil.isComposition(subType)) {
        return;
      }

      if (subType.extendedBy) {
        const superTypes = OmniUtil.getFlattenedSuperTypes(subType.extendedBy);

        const uniqueSuperTypesOfSubType = (map.has(subType) ? map : map.set(subType, [])).get(subType)!;
        for (const superType of superTypes) {
          if (!uniqueSuperTypesOfSubType.includes(superType)) {
            uniqueSuperTypesOfSubType.push(superType);
          }
        }
      }
    });

    return map;
  }

  /**
   * Heavy operation, mostly useful for testing or diagnostics
   */
  public static getSuperTypeToSubTypesMap(model: OmniModel): Map<OmniSuperTypeCapableType, OmniSubTypeCapableType[]> {

    // We just take the sub-to-super map and flip it around.
    const subToSuperMap = OmniUtil.getSubTypeToSuperTypesMap(model);
    const superToSubMap = new Map<OmniSuperTypeCapableType, OmniSubTypeCapableType[]>();
    for (const entry of subToSuperMap.entries()) {

      const subType = entry[0];
      const superTypes = entry[1];

      for (const superType of superTypes) {

        let mapEntry = superToSubMap.get(superType);
        if (!mapEntry) {
          mapEntry = [];
          superToSubMap.set(superType, mapEntry);
        }

        if (!mapEntry.includes(subType)) {
          mapEntry.push(subType);
        }
      }
    }

    return superToSubMap;
  }

  /**
   * One type might have multiple supertypes. It depends on target language if it is supported or not.
   */
  public static getSuperTypeHierarchy(model: OmniModel, type: OmniSubTypeCapableType | undefined): OmniSuperTypeCapableType[] {

    const path: OmniSuperTypeCapableType[] = [];
    if (!type) {
      return path;
    }

    const queue: OmniSubTypeCapableType[] = [type];
    let maxDepth = 100;
    while (queue.length > 0) {

      if (maxDepth-- <= 0) {
        throw new Error(`Found endlessly recursive super-type hierarchy from ${OmniUtil.describe(type)}`);
      }

      const dequeued = queue.pop();
      const superTypes = OmniUtil.getSuperTypes(model, dequeued);
      path.push(...superTypes);
      for (const superType of superTypes) {
        if (OmniUtil.asSubType(superType)) {
          queue.push(superType);
        }
      }
    }

    return path;
  }

  public static toLiteralValue(value: unknown): LiteralValue {

    if (typeof value == 'string') {
      return value;
    } else if (typeof value == 'number') {
      return value;
    } else if (typeof value == 'boolean') {
      return value;
    } else {
      return String(value);
    }
  }

  public static nativeLiteralToPrimitiveKind(value: LiteralValue): OmniPrimitiveKinds {
    if (typeof value === 'string') {
      return OmniTypeKind.STRING;
    } else if (typeof value === 'number') {
      return OmniTypeKind.NUMBER;
    } else if (typeof value === 'boolean') {
      return OmniTypeKind.BOOL;
    } else if (value === null) {
      return OmniTypeKind.NULL;
    } else if (typeof value === 'object') {
      throw new Error(`Need to implement what should happen if given an object literal`);
    }

    assertNever(value);
  }

  /**
   * NOTE: Probably outdated, since Omni does not really have notion of "additional properties" instead can have multiple pattern properties.
   */
  public static hasAdditionalProperties(type: OmniObjectType): boolean {
    for (const property of type.properties) {
      if (OmniUtil.isPatternPropertyName(property.name)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Does not take into account any type that this type extends from.
   * Only checks the direct type, if it is empty and could in theory be removed.
   *
   * @param type The generic type to check if it counts as empty.
   * @returns true if the type counts as empty, otherwise false.
   */
  public static isEmptyType(type: OmniType): boolean {

    if (type.kind == OmniTypeKind.OBJECT) {
      if (type.properties.length == 0 && !OmniUtil.hasAdditionalProperties(type)) {
        return true;
      }
    }

    return false;
  }

  public static isNull<T extends OmniType>(type: T): type is OmniTypeOf<T, typeof OmniTypeKind.NULL> {
    return type.kind === OmniTypeKind.NULL;
  }

  public static isUndefined(type: OmniType): type is OmniTypeOf<OmniPrimitiveType, typeof OmniTypeKind.UNDEFINED> {
    return type.kind === OmniTypeKind.UNDEFINED;
  }

  /**
   * Returns a general name for the primitive.
   * Does not translate into the actual target language's primitive type.
   * Is used for generating property names or used in general logging.
   *
   * @param kind
   * @param nullable
   */
  public static getVirtualPrimitiveKindName(kind: OmniPrimitiveKinds, nullable: boolean): string {

    switch (kind) {
      case OmniTypeKind.BOOL:
        return nullable ? 'Boolean' : 'bool';
      case OmniTypeKind.VOID:
        return 'void';
      case OmniTypeKind.CHAR:
        return nullable ? 'Character' : 'char';
      case OmniTypeKind.STRING:
        return nullable ? 'String' : 'string';
      case OmniTypeKind.FLOAT:
        return nullable ? 'Float' : 'float';
      case OmniTypeKind.INTEGER:
        return nullable ? 'Integer' : 'int';
      case OmniTypeKind.INTEGER_SMALL:
        return nullable ? 'Short' : 'short';
      case OmniTypeKind.LONG:
        return nullable ? 'Long' : 'long';
      case OmniTypeKind.DECIMAL:
        return nullable ? 'Decimal' : 'decimal';
      case OmniTypeKind.DOUBLE:
        return nullable ? 'Double' : 'double';
      case OmniTypeKind.NUMBER:
        return nullable ? 'Number' : 'number';
      case OmniTypeKind.NULL:
        return 'null';
      case OmniTypeKind.UNDEFINED:
        return 'undefined';
    }
  }

  /**
   * Gives the name of the type, or a description which describes the type.
   * Should only ever be used for logging or comments or other non-essential things.
   *
   * @param type
   */
  public static describe(type: OmniType | undefined): string {

    if (!type) {
      return '[undefined]';
    }

    if (type.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
      const parts: string[] = [];
      if (type.upperBound) {
        parts.push(`upper=${OmniUtil.describe(type.upperBound)}`);
      }
      if (type.lowerBound) {
        parts.push(`lower=${OmniUtil.describe(type.lowerBound)}`);
      }

      if (parts.length > 0) {
        return `${type.placeholderName}: ${parts.join(', ')}`;
      } else {
        return type.placeholderName;
      }

    } else if (type.kind == OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
      if (type.placeholderName) {
        return `[${OmniUtil.describe(type.type)} as ${type.placeholderName} -> ${type.sourceIdentifier.placeholderName}]`;
      } else {
        return `[${OmniUtil.describe(type.type)} -> ${type.sourceIdentifier.placeholderName}]`;
      }
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return `${OmniUtil.getTypeName(type)}<${type.targetIdentifiers.map(identifier => OmniUtil.describe(identifier))}>`;
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
      return `${OmniUtil.getTypeName(type)}<${type.sourceIdentifiers.map(identifier => OmniUtil.describe(identifier))}>`;
    }

    const baseName = Naming.unwrap(OmniUtil.getVirtualTypeName(type), (name, parts) => {
      if (parts && parts.length > 0) {
        return `${parts.join('')}${name}`;
      } else {
        return name;
      }
    });

    if (type.kind == OmniTypeKind.OBJECT) {
      if (type.extendedBy) {
        return `${baseName} [${type.kind}, with ${OmniUtil.describe(type.extendedBy)}]`;
      } else {
        return `${baseName} [${type.kind}]`;
      }
    }

    if (OmniUtil.isPrimitive(type)) {
      let suffix = '';

      if (type.value) {
        const resolvedString = OmniUtil.primitiveConstantValueToString(type.value);
        suffix = `=${resolvedString}`;
      }

      let prefix = '';
      if (type.nullable === true) {
        prefix = '?';
      } else if (type.nullable === false) {
        prefix = '!';
      }

      return `${baseName} [${type.kind}${prefix} ${suffix}]`;
    }

    return `${baseName} [${type.kind}]`;
  }

  public static primitiveConstantValueToString(value: OmniPrimitiveConstantValue): string {
    if (typeof value == 'string') {
      return value;
    } else {
      return String(value);
    }
  }

  /**
   * Gets the name of the type, or returns 'undefined' if the type is not named.
   *
   * @param type The type to try and find a name for
   */
  public static getTypeName(type: OmniType): TypeName | undefined {

    if ('name' in type && type.name) {
      return type.name;
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      return OmniUtil.getTypeName(type.source);
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
      return OmniUtil.getTypeName(type.of);
    } else if (type.kind == OmniTypeKind.INTERFACE) {
      return type.name || OmniUtil.getTypeName(type.of);
    } else if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return type.name || OmniUtil.getTypeName(type.of);
    }

    return undefined;
  }

  public static isNullableType(type: OmniType): type is ((OmniPrimitiveType & { nullable: true }) | OmniPrimitiveNull) {

    if (OmniUtil.isPrimitive(type)) {
      if (type.kind == OmniTypeKind.STRING || type.kind == OmniTypeKind.NULL || type.kind == OmniTypeKind.VOID) {
        return true;
      }

      // In some languages a string is always nullable, but that is up to the target language to handle somehow.
      return type.nullable ?? false;
    }

    return true;
  }

  public static getSpecifiedDefaultValue(type: OmniType): LiteralValue | undefined {
    if (OmniUtil.isPrimitive(type) && !type.literal) {
      return type.value;
    } else {
      return undefined;
    }
  }

  public static hasSpecifiedConstantValue(type: OmniType): type is OmniPrimitiveType & { literal: true } {

    if (OmniUtil.isPrimitive(type)) {
      if (type.literal === true) {
        return true;
      }
    }

    return false;
  }

  public static getSpecifiedConstantValue(type: OmniType): OmniPrimitiveConstantValue | null | undefined {
    if (OmniUtil.isPrimitive(type)) {
      if (type.literal === true) {
        return type.value;
      }
    }

    return undefined;
  }

  /**
   * IMPORTANT to remember that this is NOT an actual type name, it is a VIRTUAL type name for identification.
   *
   * NOT to be relied upon or used for naming output classes or types.
   */
  public static getVirtualTypeName(type: OmniType): TypeName {

    if (type.kind == OmniTypeKind.ARRAY) {
      return {
        prefix: 'ArrayOf',
        name: OmniUtil.getVirtualTypeName(type.of),
      };
    } else if (type.kind == OmniTypeKind.TUPLE) {
      return {
        prefix: 'TupleOf',
        name: type.types.map(it => OmniUtil.getVirtualTypeName(it)).join(''),
      };
    } else if (type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      return {
        prefix: 'PropertiesByPositionOf',
        name: type.properties.map(it => Case.pascal(String(OmniUtil.getPropertyNameOrPattern(it.name)))).join(''),
      };
    } else if (OmniUtil.isPrimitive(type)) {
      return OmniUtil.getVirtualPrimitiveKindName(type.kind, OmniUtil.isNullableType(type));
    } else if (type.kind == OmniTypeKind.UNKNOWN) {
      if (type.valueDefault != undefined) {
        return OmniUtil.primitiveConstantValueToString(type.valueDefault);
      }
      switch (type.unknownKind ?? UnknownKind.WILDCARD) {
        case UnknownKind.MUTABLE_OBJECT:
          return '_json';
        case UnknownKind.MAP:
          return '_map';
        case UnknownKind.OBJECT:
          return '_object';
        case UnknownKind.WILDCARD:
          return '_wildcard';
        case UnknownKind.ANY:
          return '_any';
        default:
          throw new Error(`Unknown UnknownType '${type.unknownKind}`);
      }

    } else if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return {
        prefix: OmniUtil.getVirtualTypeName(type.of),
        name: 'From',
        suffix: type.model.name,
      };
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
      const genericTypes = type.targetIdentifiers.map(it => OmniUtil.getVirtualTypeName(it));
      const genericTypeString = genericTypes.join(', ');
      return {
        name: OmniUtil.getTypeName(type) ?? 'N/A',
        suffix: `<${genericTypeString}>`,
      };
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
      return type.placeholderName || type.sourceIdentifier.placeholderName;
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
      return type.placeholderName;
    } else if (type.kind == OmniTypeKind.DECORATING) {
      return `Decorated(${OmniUtil.getVirtualTypeName(type.of)})`;
    } else if (type.kind == OmniTypeKind.DICTIONARY) {

      // TODO: Convert this into a generic type instead! Do NOT rely on this UGLY hardcoded string method!
      const keyName = OmniUtil.getVirtualTypeName(type.keyType);
      const valueName = OmniUtil.getVirtualTypeName(type.valueType);
      return {
        prefix: `[`,
        name: {
          prefix: keyName,
          name: ': ',
          suffix: valueName,
        },
        suffix: ']',
      };
    } else if (type.kind == OmniTypeKind.HARDCODED_REFERENCE) {
      return type.fqn;
    } else if (OmniUtil.isComposition(type)) {

      let prefix: TypeName;
      if (type.kind == OmniTypeKind.EXCLUSIVE_UNION) {
        prefix = ['UnionOf', 'ExclusiveUnionOf'];
      } else if (type.kind == OmniTypeKind.UNION) {
        prefix = 'UnionOf';
      } else if (type.kind == OmniTypeKind.INTERSECTION) {
        prefix = 'IntersectionOf';
      } else if (type.kind == OmniTypeKind.NEGATION) {
        prefix = 'NegationOf';
      } else {
        assertUnreachable(type);
      }

      return {
        prefix: prefix,
        name: {
          prefix: '(',
          name: type.types.map(it => OmniUtil.getVirtualTypeName(it)).join(','),
        },
        suffix: `)`,
      };
    }

    const typeName = OmniUtil.getTypeName(type);
    if (typeName) {
      return Naming.unwrap(typeName);
    }

    throw new Error(`[ERROR: ADD VIRTUAL TYPE NAME FOR ${String(type.kind)}]`);
  }

  public static toReferenceType<T extends OmniType>(type: T): T {

    if (type.kind === OmniTypeKind.DECORATING) {

      const ofAsRef = OmniUtil.toReferenceType(type.of);
      if (ofAsRef === type.of) {
        return type;
      }

      return ({
        ...type,
        of: ofAsRef,
      } satisfies OmniDecoratingType) as T;
    }

    // NOTE: If changed, make sure isNullable is updated
    if (OmniUtil.isPrimitive(type)) {

      if (type.kind == OmniTypeKind.STRING
        || type.kind == OmniTypeKind.NULL
        || type.kind == OmniTypeKind.VOID) {

        // NOTE: The string part is NOT always true, this should be moved to code for the specific language
        return type;
      }

      if (type.nullable) {
        return type;
      }

      return {
        ...type,
        nullable: true,
      };
    }

    return type;
  }

  /**
   * Iterates through a type and all its related types, and replaces all found needles with the given replacement.
   *
   * If a type is returned from this method, then it is up to the caller to replace the type relative to the root's owner.
   *
   * TODO: Implement a general way of traversing all the types, so we do not need to duplicate this functionality everywhere!
   *
   * TODO: This feels very inefficient right now... needs a very good revamp
   *
   * TODO: Replace with a tree-folding traverser/visitor instead
   *
   * @param parent Parent to start looking within
   * @param from Type to replace from, the needle
   * @param to Type to replace with, the replacement
   * @param maxDepth How deep into a type structure we will search
   */
  public static swapType<T extends OmniType, R extends OmniType>(
    parent: TypeOwner,
    from: T,
    to: R,
    maxDepth = 10,
  ): R | undefined {

    if (parent == from) {
      return to;
    }

    if (maxDepth == 0) {
      return undefined;
    }

    // TODO: Make use of the improved type traverser instead!

    if ('endpoints' in parent) {
      this.swapTypeInsideModel(parent, from, to, maxDepth);
    } else if ('type' in parent && !('kind' in parent)) {
      this.swapTypeInsideTypeOwner(parent, from, to, maxDepth);
    } else {
      this.swapTypeInsideType(parent, from, to, maxDepth);
    }

    return undefined;
  }

  /**
   * TODO: Replace with a tree-folding traverser/visitor instead
   */
  private static swapTypeInsideType<T extends OmniType, R extends OmniType>(parent: OmniType, from: T, to: R, maxDepth: number): void {

    switch (parent.kind) {
      case OmniTypeKind.UNION:
      case OmniTypeKind.EXCLUSIVE_UNION:
      case OmniTypeKind.INTERSECTION:
      case OmniTypeKind.NEGATION: {
        for (let i = 0; i < parent.types.length; i++) {
          const found = OmniUtil.swapType(parent.types[i], from, to, maxDepth - 1);
          if (found) {
            parent.types.splice(i, 1, to);
          }
        }
        break;
      }
      case OmniTypeKind.OBJECT: {
        if (parent.extendedBy) {
          // We do not decrease the max depth if it's a composition, since it is an invisible wrapper
          const decrementDepthBy = (OmniUtil.isComposition(parent.extendedBy)) ? 0 : 1;
          const found = OmniUtil.swapType(parent.extendedBy, from, to, maxDepth - decrementDepthBy);
          if (found) {
            if (OmniUtil.asSuperType(to)) {
              parent.extendedBy = to;
            } else {

              // If the replacement is not a potential supertype, then we will not swap it.
              // This can happen if we are replacing a type with the GenericSource.
              // But the type in the extendedBy should not be a GenericSource, it should be a GenericTarget.
              // That will be handled inside GenericsOmniModelTransformer.
            }
          }
        }

        for (const property of parent.properties) {
          const found = OmniUtil.swapType(property.type, from, to, maxDepth - 1);
          if (found) {
            property.type = to;
          }
        }
        break;
      }
      case OmniTypeKind.INTERFACE: {
        const found = OmniUtil.swapType(parent.of, from, to, maxDepth - 1);
        if (found) {
          if (OmniUtil.asSuperType(to)) {
            parent.of = to;
          } else {
            throw new Error(`Cannot replace, since the interface requires a replacement that is inheritable`);
          }
        }
        break;
      }
      case OmniTypeKind.GENERIC_TARGET: {
        for (let i = 0; i < parent.targetIdentifiers.length; i++) {

          const identifier = parent.targetIdentifiers[i];
          const found = OmniUtil.swapType(identifier, from, to, maxDepth);
          if (found) {
            if (found.kind == OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
              parent.targetIdentifiers[i] = found;
            } else {
              throw new Error(`Can only swap out the source identifier with another of same type`);
            }
          }
        }

        const found = OmniUtil.swapType(parent.source, from, to, maxDepth - 1);
        if (found) {
          if (found.kind == OmniTypeKind.GENERIC_SOURCE) {
            parent.source = found;
          } else {
            throw new Error(`Cannot replace, since '${OmniUtil.describe(found)}' must be a generic source`);
          }
        }
        break;
      }
      case OmniTypeKind.GENERIC_TARGET_IDENTIFIER: {
        const found = OmniUtil.swapType(parent.type, from, to, maxDepth - 1);
        if (found) {
          parent.type = found;
        }
        break;
      }
      case OmniTypeKind.GENERIC_SOURCE: {
        for (let i = 0; i < parent.sourceIdentifiers.length; i++) {
          const identifier = parent.sourceIdentifiers[i];
          const found = OmniUtil.swapType(identifier, from, to, maxDepth);
          if (found) {
            if (found.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
              parent.sourceIdentifiers[i] = found;
            } else {
              throw new Error(`Can only swap out the source identifier with another of same type`);
            }
          }
        }

        const found = OmniUtil.swapType(parent.of, from, to, maxDepth - 1);
        if (found) {
          const foundAsSuperType = OmniUtil.asGenericSuperType(found);
          if (foundAsSuperType) {
            parent.of = foundAsSuperType;
          } else {
            throw new Error(`Cannot replace, since replacement '${OmniUtil.describe(found)}' has to be a supertype`);
          }
        }
        break;
      }
      case OmniTypeKind.GENERIC_SOURCE_IDENTIFIER: {
        if (parent.lowerBound) {
          const found = OmniUtil.swapType(parent.lowerBound, from, to, maxDepth - 1);
          if (found) {
            parent.lowerBound = found;
          }
        }
        if (parent.upperBound) {
          const found = OmniUtil.swapType(parent.upperBound, from, to, maxDepth - 1);
          if (found) {
            parent.upperBound = found;
          }
        }
        if (parent.knownEdgeTypes) {
          for (let i = 0; i < parent.knownEdgeTypes.length; i++) {
            const edge = parent.knownEdgeTypes[i];
            const found = OmniUtil.swapType(edge, from, to, maxDepth);
            if (found) {
              parent.knownEdgeTypes[i] = found;
            }
          }
        }
        break;
      }
      case OmniTypeKind.DICTIONARY: {
        const foundKey = OmniUtil.swapType(parent.keyType, from, to, maxDepth - 1);
        if (foundKey) {
          parent.keyType = foundKey;
        }

        const foundValue = OmniUtil.swapType(parent.valueType, from, to, maxDepth - 1);
        if (foundValue) {
          parent.valueType = foundValue;
        }
        break;
      }
      case OmniTypeKind.TUPLE: {
        for (let i = 0; i < parent.types.length; i++) {
          const found = OmniUtil.swapType(parent.types[i], from, to, maxDepth - 1);
          if (found) {
            parent.types.splice(i, 1, found);
          }
        }
        break;
      }
      case OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION: {
        for (const property of parent.properties) {
          const found = OmniUtil.swapType(property.type, from, to, maxDepth - 1);
          if (found) {
            property.type = found;
          }
        }
        break;
      }
      case OmniTypeKind.ARRAY: {
        const found = OmniUtil.swapType(parent.of, from, to, maxDepth - 1);
        if (found) {
          parent.of = found;
        }
        break;
      }
    }
  }

  private static swapTypeInsideTypeOwner<T extends OmniType, R extends OmniType>(
    parent: OmniInput | OmniOutput | OmniProperty,
    from: T,
    to: R,
    maxDepth: number,
  ): void {

    const found = OmniUtil.swapType(parent.type, from, to, maxDepth);
    if (found) {
      parent.type = found;
    }
  }

  private static swapTypeInsideModel<T extends OmniType, R extends OmniType>(
    parent: OmniModel,
    from: T,
    to: R,
    maxDepth: number,
  ): void {

    [...parent.types].forEach(t => {

      const swapped = OmniUtil.swapType(t, from, to, maxDepth);
      if (swapped) {
        // NOTE: Might crash when we remove from ourselves?
        const idx = parent.types.indexOf(t);
        if (idx !== -1) {
          parent.types.splice(idx, 1, swapped);
        }
      }
    });

    parent.endpoints.forEach(e => {

      const swapped = OmniUtil.swapType(e.request, from, to, maxDepth);
      if (swapped) {
        e.request.type = swapped;
      }

      e.responses.forEach(r => {
        const swapped = OmniUtil.swapType(r.type, from, to, maxDepth);
        if (swapped) {
          r.type = swapped;
        }
      });
    });
    (parent.continuations || []).forEach(c => {
      c.mappings.forEach(m => {
        (m.source.propertyPath || []).forEach(p => {
          const swappedOwner = OmniUtil.swapType(p.owner, from, to, maxDepth);
          if (swappedOwner) {
            p.owner = swappedOwner as OmniPropertyOwner;
          }

          const swappedType = OmniUtil.swapType(p.type, from, to, maxDepth);
          if (swappedType) {
            p.type = swappedType;
          }
        });
        (m.target.propertyPath || []).forEach(p => {
          const swappedOwner = OmniUtil.swapType(p.owner, from, to, maxDepth);
          if (swappedOwner) {
            p.owner = swappedOwner as OmniPropertyOwner;
          }

          const swappedType = OmniUtil.swapType(p.type, from, to, maxDepth);
          if (swappedType) {
            p.type = swappedType;
          }
        });
      });
    });
  }

  public static isDisqualifyingDiffForCommonType(diffs?: TypeDiffKind[]): boolean {

    if (diffs) {
      return diffs.some(it => it == TypeDiffKind.FUNDAMENTAL_TYPE || it == TypeDiffKind.NARROWED_LITERAL_TYPE);
    }

    return false;
  }

  public static getDiffAmount(diffs?: TypeDiffKind[]): number {

    if (diffs) {
      if (diffs.includes(TypeDiffKind.FUNDAMENTAL_TYPE)) {
        return 10;
      } else if (diffs.includes(TypeDiffKind.ISOMORPHIC_TYPE)) {
        return 9;
      } else if (diffs.includes(TypeDiffKind.NARROWED_LITERAL_TYPE)) {
        return 8;
      } else if (diffs.includes(TypeDiffKind.NO_GENERIC_OVERLAP)) {
        return 7;
      } else if (diffs.includes(TypeDiffKind.NARROWED_TYPE)) {
        return 6;
      } else if (diffs.includes(TypeDiffKind.SIZE)) {
        return 5;
      } else if (diffs.includes(TypeDiffKind.PRECISION)) {
        return 4;
      }
    }

    return 0;
  }

  public static isDifferent(a: OmniType, b: OmniType, features: TargetFeatures): boolean {

    const commonDenominator = OmniUtil.getCommonDenominatorBetween(a, b, features);
    if (!commonDenominator) {
      return true;
    }

    const diffAmount = OmniUtil.getDiffAmount(commonDenominator?.diffs);
    return diffAmount > 0;
  }

  public static getCommonDenominator(options: TargetFeatures | { features: TargetFeatures, create?: boolean }, ...types: OmniType[]): CommonDenominatorType | undefined {

    if (types.length == 1) {
      return {
        type: types[0],
      };
    }

    const opt = ('features' in options) ? options : {features: options, create: undefined};


    let commonDiffAmount = 0;
    let common: CommonDenominatorType<OmniType> = {
      type: types[0],
    };

    for (let i = 1; i < types.length; i++) {

      const denominator = OmniUtil.getCommonDenominatorBetween(common.type, types[i], opt.features, opt.create);
      if (!denominator) { // } || (denominator.diffs && denominator.diffs.includes(TypeDiffKind.FUNDAMENTAL_TYPE))) {
        return undefined;
      }

      const diffAmount = OmniUtil.getDiffAmount(denominator.diffs);
      if (diffAmount > commonDiffAmount) {
        commonDiffAmount = diffAmount;
        common = denominator;
      }
    }

    return common;
  }

  /**
   * Checks for equality or a common denominator between two types. Will return the type and level of equality.
   *
   * @param a - First type to compare with
   * @param b - Second type to compare to
   * @param targetFeatures - Description of the features that the caller supports, so we can know what it supports
   * @param create - True if a new type should be created and returned, if common denominator can be achieved that way
   */
  public static getCommonDenominatorBetween(
    a: OmniType,
    b: OmniType,
    targetFeatures: TargetFeatures,
    create?: boolean,
  ): CommonDenominatorType<OmniType> | undefined {

    if (a == b) {
      return {type: a};
    }

    if (OmniUtil.isPrimitive(a) && OmniUtil.isPrimitive(b)) {
      return OmniUtil.getCommonDenominatorBetweenPrimitives(a, b, targetFeatures, create);
    } else if (a.kind == OmniTypeKind.HARDCODED_REFERENCE && b.kind == OmniTypeKind.HARDCODED_REFERENCE) {
      return OmniUtil.getCommonDenominatorBetweenHardcodedReferences(a, b);
    } else if (a.kind == OmniTypeKind.ENUM && b.kind == OmniTypeKind.ENUM) {
      // TODO: This can probably be VERY much improved -- like taking the entries that are similar between the two
      return OmniUtil.getCommonDenominatorBetweenEnums(a, b);
    } else if (a.kind == OmniTypeKind.DICTIONARY && b.kind == OmniTypeKind.DICTIONARY) {
      return OmniUtil.getCommonDenominatorBetweenDictionaries(a, b, targetFeatures, create);
    } else if (a.kind == OmniTypeKind.ARRAY && b.kind == OmniTypeKind.ARRAY) {
      return OmniUtil.getCommonDenominatorBetweenArrays(a, b, targetFeatures, create);
    } else if (a.kind == OmniTypeKind.UNKNOWN && b.kind == OmniTypeKind.UNKNOWN) {
      return {type: a};
    } else if (a.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION && b.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      return OmniUtil.getCommonDenominatorBetweenPropertiesByPosition(a, b, targetFeatures, create);
    } else if (a.kind == OmniTypeKind.OBJECT && b.kind == OmniTypeKind.OBJECT) {
      const result = OmniUtil.getCommonDenominatorBetweenObjects(a, b, targetFeatures, create);
      if (result) {
        return result;
      }
    }

    if (a.kind == OmniTypeKind.OBJECT || b.kind == OmniTypeKind.OBJECT) {
      return this.getCommonDenominatorBetweenObjectAndOther(a, b, targetFeatures, create);
    } else if (OmniUtil.isComposition(a)) {
      // TODO: Do something here. There might be parts of 'a' and 'b' that are similar.
      // TODO: Should we then create a new composition type, or just return the first match?
    } else if (a.kind == OmniTypeKind.GENERIC_TARGET) {
      if (b.kind == OmniTypeKind.GENERIC_TARGET) {
        return OmniUtil.getCommonDenominatorBetweenGenericTargets(a, b, targetFeatures, create);
      }
    } else if ((a.kind == OmniTypeKind.ENUM || OmniUtil.isPrimitive(a)) && (b.kind == OmniTypeKind.ENUM || OmniUtil.isPrimitive(b))) {

      const enumOption = (a.kind == OmniTypeKind.ENUM) ? a : (b.kind == OmniTypeKind.ENUM) ? b : undefined;
      const primitiveOption = (OmniUtil.isPrimitive(a)) ? a : (OmniUtil.isPrimitive(b)) ? b : undefined;

      if (enumOption && primitiveOption) {
        return OmniUtil.getCommonDenominatorBetweenEnumAndPrimitive(enumOption, primitiveOption);
      }
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenEnumAndPrimitive(a: OmniEnumType, b: OmniPrimitiveType): CommonDenominatorType | undefined {

    if (a.itemKind === b.kind) {
      return {type: b, diffs: [TypeDiffKind.NARROWED_TYPE]};
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenGenericTargets(
    a: OmniGenericTargetType,
    b: OmniGenericTargetType,
    targetFeatures: TargetFeatures,
    create?: boolean,
  ): CommonDenominatorType<OmniGenericTargetType> | undefined {

    if (a.source != b.source) {
      return undefined;
    }

    const commonTargetIdentifiers: OmniGenericTargetIdentifierType[] = [];

    const matching = OmniUtil.getMatchingTargetIdentifiers(a.targetIdentifiers, b.targetIdentifiers);
    if (!matching) {
      return undefined;
    }

    const uniqueDiffs = new Set<TypeDiffKind>();
    for (const match of matching) {

      let commonIdentifierType = OmniUtil.getCommonDenominatorBetween(match.a.type, match.b.type, targetFeatures, create);
      if (!commonIdentifierType) {

        // The source is the same, the identifiers are the same, but there is no common type between them.
        // But in almost all languages then, we want the generic type to be "?" or "any" or similar.
        // We might want to change this depending on language, but that's a later problem.
        commonIdentifierType = {
          type: {kind: OmniTypeKind.UNKNOWN},
          diffs: [TypeDiffKind.NO_GENERIC_OVERLAP],
        };
      }

      commonTargetIdentifiers.push({
        kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
        type: commonIdentifierType.type,
        sourceIdentifier: match.a.sourceIdentifier,
      });

      for (const diff of (commonIdentifierType.diffs ?? [])) {
        uniqueDiffs.add(diff);
      }
    }

    const commonGenericTarget: OmniGenericTargetType = {
      ...a,
      targetIdentifiers: commonTargetIdentifiers,
    };

    return {
      type: commonGenericTarget,
      diffs: [...uniqueDiffs],
    };
  }

  private static getMatchingTargetIdentifiers(
    a: OmniGenericTargetIdentifierType[],
    b: OmniGenericTargetIdentifierType[],
  ): Array<TargetIdentifierTuple> | undefined {

    if (a.length != b.length) {
      return undefined;
    }

    const result: Array<TargetIdentifierTuple> = [];
    for (const aIdentifier of a) {
      let bFound: OmniGenericTargetIdentifierType | undefined = undefined;
      for (const bIdentifier of b) {
        if (aIdentifier.sourceIdentifier == bIdentifier.sourceIdentifier) {
          bFound = bIdentifier;
        }
      }

      if (bFound) {
        result.push({
          a: aIdentifier,
          b: bFound,
        });
      } else {
        return undefined;
      }
    }

    return result;
  }

  private static getCommonDenominatorBetweenObjectAndOther(
    a: OmniType,
    b: OmniType,
    targetFeatures: TargetFeatures,
    create?: boolean,
  ): CommonDenominatorType<OmniType> | undefined {

    if (b.kind == OmniTypeKind.OBJECT && b.extendedBy) {

      // This will recursively search downwards in B's hierarchy.
      const common = OmniUtil.getCommonDenominatorBetween(a, b.extendedBy, targetFeatures, create);
      if (common) {

        return {
          type: common.type,
          diffs: [...(common.diffs ?? []), TypeDiffKind.IS_SUPERTYPE],
        };
      }
    }

    if (a.kind == OmniTypeKind.OBJECT && a.extendedBy) {
      const common = OmniUtil.getCommonDenominatorBetween(a.extendedBy, b, targetFeatures, create);
      if (common) {

        return {
          type: common.type,
          diffs: [...(common.diffs ?? []), TypeDiffKind.IS_SUPERTYPE],
        };
      }
    }

    if (!create) {
      return undefined;
    }

    // Is there ever anything better we can do here? Like check if signatures are matching?
    return {
      type: {
        kind: OmniTypeKind.UNKNOWN,
      },
      diffs: [TypeDiffKind.FUNDAMENTAL_TYPE],
    };
  }

  private static getCommonDenominatorBetweenPropertiesByPosition(
    a: OmniArrayPropertiesByPositionType,
    b: OmniArrayPropertiesByPositionType,
    targetFeatures: TargetFeatures,
    create?: boolean,
  ): CommonDenominatorType<OmniArrayPropertiesByPositionType> | undefined {

    if (a.properties.length === b.properties.length) {

      const diffs: TypeDiffKind[] = [];
      for (let i = 0; i < a.properties.length; i++) {
        if (a.properties[i].name !== b.properties[i].name) {
          return undefined;
        }

        const common = OmniUtil.getCommonDenominatorBetween(a.properties[i].type, b.properties[i].type, targetFeatures, create);
        if (!common || OmniUtil.isDisqualifyingDiffForCommonType(common.diffs)) {
          return undefined;
        }

        if (common.diffs) {
          diffs.push(...common.diffs);
        }
      }

      // TODO: Return something else here instead, which is actually the common denominators between the two
      return {
        type: a,
        diffs: diffs,

        // new EqualityGrades(EqualityGrade.similar(), EqualityGrade.similar()), // EqualityLevel.FUNCTION_MIN};
      };
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenArrays(
    a: OmniArrayType,
    b: OmniArrayType,
    targetFeatures: TargetFeatures,
    create?: boolean,
  ): CommonDenominatorType<OmniArrayType> | undefined {

    const common = OmniUtil.getCommonDenominatorBetween(a.of, b.of, targetFeatures, create);
    if (common && !common?.diffs?.length) {
      return {type: a};
    }

    // NOTE: There might be some differences we can ignore; should check for them

    // const commonType = common?.type;
    if (create == false || !common) {
      return undefined;
    }

    const createdType: OmniArrayType = {
      ...b,
      ...a,
      of: common.type,
    };

    return {
      type: createdType,
      diffs: common.diffs ?? [],
    };
  }

  private static getCommonDenominatorBetweenPrimitives(
    a: OmniPrimitiveType,
    b: OmniPrimitiveType,
    targetFeatures: TargetFeatures,
    create?: boolean,
  ): CommonDenominatorType<OmniPrimitiveType> | undefined {

    if (a.kind == b.kind && a.nullable == b.nullable && a.value == b.value && a.literal == b.literal) {
      return {type: a};
    }

    const common = this.getCommonDenominatorBetweenPrimitiveKinds(a, b) || this.getCommonDenominatorBetweenPrimitiveKinds(b, a);
    if (!common) {
      return undefined;
    }

    // Check if they are properly convertible between different nullability
    let overridingNullability: boolean | undefined = undefined;
    if (a.nullable !== b.nullable) {
      if (a.nullable && common.type && common.type != a) {
        return undefined;
      }

      if (b.nullable && common.type && common.type != b) {
        return undefined;
      }

      overridingNullability = a.nullable || b.nullable;
    }

    if (overridingNullability !== undefined && common.type) {
      if (overridingNullability) {
        const nullableType = OmniUtil.toReferenceType(common.type);
        if (OmniUtil.isPrimitive(nullableType)) {
          common.type = nullableType;
          common.diffs = [...(common.diffs ?? []), TypeDiffKind.NULLABILITY];
        } else {
          throw new Error(`Reference type '${OmniUtil.describe(nullableType)}' given back was not a primitive type`);
        }
      }
    }

    if (a.value !== b.value) {
      return OmniUtil.getCommonDenominatorBetweenPrimitivesWithDifferentLiteralValues(
        a, b, common, targetFeatures,
      );
    }

    return {
      type: common.type ?? a,
      diffs: common.diffs,
    };
  }

  private static getCommonDenominatorBetweenPrimitivesWithDifferentLiteralValues(
    a: OmniPrimitiveType,
    b: OmniPrimitiveType,
    common: CommonDenominatorType<OmniPrimitiveType | undefined>,
    targetFeatures: TargetFeatures,
  ): CommonDenominatorType<OmniPrimitiveType> | undefined {

    // Then check if one of them is literal, but if the literal is the common type, then they are not covariant.
    if (a.literal && b.literal) {
      const newTypeDifference = (targetFeatures.literalTypes) ? TypeDiffKind.FUNDAMENTAL_TYPE : TypeDiffKind.NARROWED_LITERAL_TYPE;
      return {type: OmniUtil.getGeneralizedType(common.type ?? a), diffs: [...(common.diffs ?? []), newTypeDifference]};
    } else if (a.literal && !b.literal && common.type == a) {
      return {type: b, diffs: [...(common.diffs ?? []), TypeDiffKind.NARROWED_LITERAL_TYPE]};
    } else if (!a.literal && b.literal && common.type == b) {
      return {type: a, diffs: [...(common.diffs ?? []), TypeDiffKind.NARROWED_LITERAL_TYPE]};
    }

    return {type: OmniUtil.getGeneralizedType(common.type ?? a), diffs: [...(common.diffs ?? []), TypeDiffKind.NARROWED_LITERAL_TYPE]};
  }

  private static getCommonDenominatorBetweenPrimitiveKinds(
    a: OmniPrimitiveType,
    b: OmniPrimitiveType,
  ): CommonDenominatorType<OmniPrimitiveType | undefined> | undefined {

    if (a.kind == b.kind) {
      // The type being undefined means that we have no preference over a or b
      return {type: undefined};
    }

    switch (a.kind) {
      case OmniTypeKind.INTEGER_SMALL:
        switch (b.kind) {
          case OmniTypeKind.INTEGER:
          case OmniTypeKind.LONG:
            return {type: b, diffs: [TypeDiffKind.SIZE]};
          case OmniTypeKind.FLOAT:
          case OmniTypeKind.DOUBLE:
          case OmniTypeKind.DECIMAL:
            return {type: b, diffs: [TypeDiffKind.SIZE, TypeDiffKind.PRECISION]};
        }
        break;

      case OmniTypeKind.INTEGER:
        switch (b.kind) {
          case OmniTypeKind.INTEGER_SMALL:
            return {type: a, diffs: [TypeDiffKind.SIZE]};
          case OmniTypeKind.LONG:
            return {type: b, diffs: [TypeDiffKind.SIZE]};
          case OmniTypeKind.FLOAT:
            return {type: b, diffs: [TypeDiffKind.PRECISION]};
          case OmniTypeKind.DOUBLE:
          case OmniTypeKind.DECIMAL:
            return {type: b, diffs: [TypeDiffKind.SIZE, TypeDiffKind.PRECISION]};
        }
        break;
      case OmniTypeKind.LONG:
        switch (b.kind) {
          case OmniTypeKind.INTEGER_SMALL:
          case OmniTypeKind.INTEGER:
            return {type: a, diffs: [TypeDiffKind.SIZE]};
          case OmniTypeKind.FLOAT:
            return {type: a, diffs: [TypeDiffKind.SIZE, TypeDiffKind.PRECISION]};
          case OmniTypeKind.DOUBLE:
          case OmniTypeKind.DECIMAL:
            return {type: b, diffs: [TypeDiffKind.PRECISION]};
        }
        break;
      case OmniTypeKind.FLOAT:
        switch (b.kind) {
          case OmniTypeKind.INTEGER_SMALL:
          case OmniTypeKind.INTEGER:
            return {type: a, diffs: [TypeDiffKind.SIZE, TypeDiffKind.PRECISION]};
          case OmniTypeKind.DOUBLE:
          case OmniTypeKind.DECIMAL:
            return {type: b, diffs: [TypeDiffKind.SIZE, TypeDiffKind.PRECISION]};
        }
        break;
      case OmniTypeKind.DECIMAL:
        switch (b.kind) {
          case OmniTypeKind.INTEGER_SMALL:
          case OmniTypeKind.INTEGER:
          case OmniTypeKind.FLOAT:
          case OmniTypeKind.DOUBLE:
            return {type: a, diffs: [TypeDiffKind.SIZE, TypeDiffKind.PRECISION]};
        }
        break;
      case OmniTypeKind.NUMBER:
        switch (b.kind) {
          case OmniTypeKind.INTEGER:
          case OmniTypeKind.INTEGER_SMALL:
          case OmniTypeKind.LONG:
          case OmniTypeKind.DOUBLE:
          case OmniTypeKind.FLOAT:
          case OmniTypeKind.DECIMAL:
            // "number" is isomorphic to all other number types?
            return {type: a, diffs: [TypeDiffKind.ISOMORPHIC_TYPE]};
        }
        break;
      case OmniTypeKind.CHAR:
        switch (b.kind) {
          case OmniTypeKind.STRING:
            return {type: b, diffs: [TypeDiffKind.SIZE]};
        }
        break;
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenDictionaries(
    a: OmniDictionaryType,
    b: OmniDictionaryType,
    targetFeatures: TargetFeatures,
    create?: boolean,
  ): CommonDenominatorType<OmniDictionaryType> | undefined {

    const commonKey = OmniUtil.getCommonDenominatorBetween(a.keyType, b.keyType, targetFeatures, create);
    if (commonKey) {
      const commonValue = OmniUtil.getCommonDenominatorBetween(a.valueType, b.valueType, targetFeatures, create);
      if (commonValue) {
        if (commonKey.type == a.keyType && commonValue.type == a.valueType) {
          return {
            type: a,
            diffs: [...(commonKey.diffs ?? []), ...(commonValue.diffs ?? [])],
          };
        }

        if (create == false) {
          return undefined;
        }

        const newDictionary: OmniDictionaryType = {
          kind: OmniTypeKind.DICTIONARY,
          keyType: commonKey.type,
          valueType: commonValue.type,
        };

        return {
          type: {...b, ...a, ...newDictionary},
          diffs: [...(commonKey.diffs ?? []), ...(commonValue.diffs ?? [])],
        };
      }
    }

    return undefined;
  }

  /**
   * TODO: This could probably be improved by a whole lot; there are likely an unnecessary amount of comparisons
   */
  public static getDistinctTypes(
    types: OmniType[],
    targetFeatures: TargetFeatures,
    allowedDiffPredicate: (diff: TypeDiffKind) => boolean = () => false,
  ) {

    const distinctTypes: OmniType[] = [];
    for (const type of types) {

      const sameType = distinctTypes.find(it => {
        const common = OmniUtil.getCommonDenominatorBetween(type, it, targetFeatures, false);
        if (!common) {
          return false;
        }

        if (!common.diffs || common.diffs.length == 0) {
          return true;
        }

        for (const diff of common.diffs) {
          if (!allowedDiffPredicate(diff)) {
            return false;
          }
        }

        return true;
      });

      if (!sameType) {
        distinctTypes.push(type);
      }
    }

    return distinctTypes;
  }

  public static isNumericType(type: OmniType): type is OmniPrimitiveNumericType {
    return OmniUtil.isNumericKind(type.kind);
  }

  public static isNumericKind(kind: OmniTypeKind): kind is Extract<Pick<OmniPrimitiveNumericType, 'kind'>, OmniTypeKind> {

    return kind == OmniTypeKind.NUMBER
      || kind == OmniTypeKind.DOUBLE
      || kind == OmniTypeKind.LONG
      || kind == OmniTypeKind.INTEGER
      || kind == OmniTypeKind.INTEGER_SMALL
      || kind == OmniTypeKind.FLOAT
      || kind == OmniTypeKind.DECIMAL;
  }

  public static getGeneralizedType<T extends OmniType>(type: T): T {

    if (OmniUtil.isPrimitive(type) && type.value !== undefined) {

      const generalizedPrimitive: T = {
        ...type,
      };
      delete generalizedPrimitive.value;
      delete generalizedPrimitive.literal;

      return generalizedPrimitive;
    }

    return type;
  }

  public static isDiffMatch(diffs: TypeDiffKind[] | undefined, ...matches: TypeDiffKind[]): boolean {

    if (diffs) {

      for (const needle of matches) {
        if (diffs.includes(needle)) {
          return true;
        }

        if (needle == TypeDiffKind.NARROWED_LITERAL_TYPE) {
          if (diffs.includes(TypeDiffKind.FUNDAMENTAL_TYPE) || diffs.includes(TypeDiffKind.ISOMORPHIC_TYPE)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private static getCommonDenominatorBetweenObjects(
    a: OmniObjectType,
    b: OmniObjectType,
    targetFeatures: TargetFeatures,
    create: boolean | undefined,
  ): CommonDenominatorType | undefined {

    if (a.properties.length != b.properties.length) {
      return undefined;
    }

    if (a.extendedBy !== b.extendedBy) {
      return undefined;
    }

    const diffs: TypeDiffKind[] = [];
    for (let i = 0; i < a.properties.length; i++) {
      // TODO: Move all the common denominator stuff out to a separate class (it's taking too much space here)
      const equality = PropertyUtil.getPropertyEquality(a.properties[i], b.properties[i], targetFeatures);

      if (OmniUtil.isDiffMatch(equality.typeDiffs, TypeDiffKind.NARROWED_LITERAL_TYPE)) {
        return undefined;
      }

      if (PropertyUtil.isDiffMatch(equality.propertyDiffs, PropertyDifference.NAME, PropertyDifference.TYPE)) {
        return undefined;
      }

      diffs.push(...(equality.typeDiffs ?? []));
    }

    // TODO: This needs improvement, since the names should not be resolved here already. Could lead to weird results.
    const aNames: string[] = [];
    Naming.unwrap(a.name, name => {
      aNames.push(name);
    });

    const bNames: string[] = [];
    Naming.unwrap(b.name, name => {
      bNames.push(name);
    });

    if (!aNames.find(aName => bNames.includes(aName))) {
      return undefined;
    }

    return {
      type: a,
      diffs: diffs,
    };
  }

  private static getCommonDenominatorBetweenHardcodedReferences(
    a: OmniHardcodedReferenceType,
    b: OmniHardcodedReferenceType,
  ): CommonDenominatorType<OmniType> | undefined {

    return a.fqn === b.fqn ? {type: a} : undefined;
  }

  private static getCommonDenominatorBetweenEnums(
    a: OmniEnumType,
    b: OmniEnumType,
  ): CommonDenominatorType<OmniType> | undefined {

    return Naming.unwrap(a.name) == Naming.unwrap(b.name) ? {type: a} : undefined;
  }

  public static mergeType<T extends OmniType>(from: T, to: T, lossless = true, aggregate = false): T {

    if (from.kind == OmniTypeKind.OBJECT && to.kind == OmniTypeKind.OBJECT) {

      for (const fromProperty of (from.properties || [])) {
        const toProperty = to.properties?.find(p => OmniUtil.isPropertyNameMatching(p.name, fromProperty.name));
        if (!toProperty) {
          // This is a new property, and can just be added to the 'to'.
          OmniUtil.addPropertyToClassType(fromProperty, to);
        } else {
          // This property already exists, so we should try and find common type.
          if (lossless) {
            throw new Error(`Property ${toProperty.name} already exists, and merging should be lossless`);
          } else {
            OmniUtil.mergeTwoPropertiesAndAddToClassType(fromProperty, toProperty, to);
          }
        }
      }
    } else if (OmniUtil.isPrimitive(from) && OmniUtil.isPrimitive(to)) {

      const newNullable = (from.nullable || to.nullable) ?? false;
      if (newNullable != to.nullable) {
        if (newNullable && OmniUtil.isNullableType(to)) {
          to.nullable = newNullable;
        } else {
          if (lossless) {
            throw new Error(`Could not merge from ${OmniUtil.describe(from)} to ${OmniUtil.describe(to)} since one is nullable and the other is not`);
          }
        }
      }

      return OmniUtil.mergeTypeMeta(from, to, lossless, aggregate);
    }

    return to;
  }

  public static cloneAndCopyTypeMeta(toClone: OmniType & OmniOptionallyNamedType, toCopyMetaFrom: OmniType): typeof toClone {

    const cloned: typeof toClone = {
      ...toClone,
    };

    OmniUtil.copyTypeMeta(toCopyMetaFrom, cloned);

    const newName = ('name' in toCopyMetaFrom ? toCopyMetaFrom.name : undefined) ?? toClone.name;
    if (newName) {
      cloned.name = newName;
    }

    return cloned;
  }

  public static copyTypeMeta(from: OmniType, to: OmniType): void {

    if (from.description) {
      to.description = from.description ?? to.description;
    }
    if (from.summary) {
      to.summary = from.summary ?? to.summary;
    }
    if (from.accessLevel) {
      to.accessLevel = from.accessLevel ?? to.accessLevel;
    }
    if (from.debug) {
      to.debug = from.debug ?? to.debug;
    }
    if (from.title) {
      to.title = from.title ?? to.title;
    }
    if (from.absoluteUri) {
      to.absoluteUri = from.absoluteUri ?? to.absoluteUri;
    }
  }

  public static getDiff(baseline: OmniType, other: OmniType, features: TargetFeatures): Diff[] {

    if (baseline == other) {
      return [];
    }

    if (baseline.kind === OmniTypeKind.OBJECT && other.kind === OmniTypeKind.OBJECT) {
      return this.getDiffOfObjects(baseline, other, features);
    } else {

      const common = OmniUtil.getCommonDenominatorBetween(baseline, other, features, false);
      if (common === undefined) {
        return [{kind: DiffKind.TYPE, typeDiffs: [TypeDiffKind.FUNDAMENTAL_TYPE]}];
      } else if (common.diffs && common.diffs.length > 0) {
        return [{kind: DiffKind.TYPE, typeDiffs: common.diffs}];
      } else if (common.type == baseline) {
        return [];
      } else {
        return [{kind: DiffKind.TYPE, typeDiffs: common.diffs ?? [TypeDiffKind.FUNDAMENTAL_TYPE]}];
      }
    }
  }

  public static getDiffOfObjects(baseline: OmniObjectType, other: OmniObjectType, features: TargetFeatures): Diff[] {

    const diffs: Diff[] = [];

    const baseProperties = OmniUtil.getPropertiesOf(baseline);
    const otherProperties = OmniUtil.getPropertiesOf(other);

    for (const baseProperty of baseProperties) {

      const withSameName = otherProperties.find(it => (it.name == baseProperty.name));
      if (withSameName) {

        const propertyCommon = OmniUtil.getCommonDenominatorBetween(baseProperty.type, withSameName.type, features, false);
        if (propertyCommon === undefined) {
          diffs.push({kind: DiffKind.PROPERTY_TYPE, propertyName: OmniUtil.getPropertyName(baseProperty.name, true)});
        } else if (propertyCommon?.diffs && propertyCommon.diffs.length > 0) {
          diffs.push({kind: DiffKind.PROPERTY_TYPE, propertyName: OmniUtil.getPropertyName(baseProperty.name, true)});
        }

      } else {

        // This property does not exist in the other object, so it is different by virtue of existing.
        diffs.push({kind: DiffKind.MISSING_PROPERTY, propertyName: OmniUtil.getPropertyName(baseProperty.name, true)});
      }
    }

    for (const otherProperty of otherProperties) {

      const existsInBase = baseProperties.find(it => it.name == otherProperty.name);
      if (!existsInBase) {
        diffs.push({kind: DiffKind.EXTRA_PROPERTY, propertyName: OmniUtil.getPropertyName(otherProperty.name, true)});
      }
    }

    return diffs;
  }

  /**
   * Takes a list of diffs and returns those that can be used to uniquely identify the baseline type from the other types that generated the diffs.
   *
   * A diff needs to be present in each set of diffs to be trusted as a diff that covers all known cases.
   */
  public static getAllEncompassingDiffs(baseline: OmniType, others: OmniType[], features: TargetFeatures): Diff[] {

    const unique: Diff[] = [];

    const missingProperty = new Map<string, number>();
    const extraProperty = new Map<string, number>();
    let otherType = 0;
    const otherDifferences = new Set<TypeDiffKind>();
    const otherPropertyType = new Map<string, number>();

    for (const other of others) {
      const diffs = OmniUtil.getDiff(baseline, other, features);
      for (const diff of diffs) {
        if (diff.kind == DiffKind.MISSING_PROPERTY) {
          missingProperty.set(diff.propertyName, (missingProperty.get(diff.propertyName) ?? 0) + 1);
          otherPropertyType.set(diff.propertyName, (otherPropertyType.get(diff.propertyName) ?? 0) + 1);
        } else if (diff.kind == DiffKind.EXTRA_PROPERTY) {
          extraProperty.set(diff.propertyName, (extraProperty.get(diff.propertyName) ?? 0) + 1);
          otherPropertyType.set(diff.propertyName, (otherPropertyType.get(diff.propertyName) ?? 0) + 1);
        } else if (diff.kind == DiffKind.TYPE) {
          otherType++;
          diff.typeDiffs.forEach(it => otherDifferences.add(it));
          if (baseline.kind == OmniTypeKind.OBJECT) {
            for (const property of baseline.properties) {
              const resolvedName = OmniUtil.getPropertyName(property.name, true);
              missingProperty.set(resolvedName, (missingProperty.get(resolvedName) ?? 0) + 1);
            }
          } else if (other.kind == OmniTypeKind.OBJECT) {
            for (const property of other.properties) {
              const resolvedName = OmniUtil.getPropertyName(property.name, true);
              missingProperty.set(resolvedName, (missingProperty.get(resolvedName) ?? 0) + 1);
            }
          }
        } else if (diff.kind == DiffKind.PROPERTY_TYPE) {
          otherPropertyType.set(diff.propertyName, (otherPropertyType.get(diff.propertyName) ?? 0) + 1);
        }
      }
    }

    for (const [propertyName, count] of missingProperty.entries()) {
      if (count == others.length) {
        // Flip the "requirement", and delete any property type difference, since existence is enough.
        unique.push({kind: DiffKind.EXTRA_PROPERTY, propertyName: propertyName});
        otherPropertyType.delete(propertyName);
      }
    }

    for (const [propertyName, count] of extraProperty.entries()) {
      if (count == others.length) {
        // Flip the "requirement", and delete any property type difference, since non-existence is enough.
        unique.push({kind: DiffKind.MISSING_PROPERTY, propertyName: propertyName});
        otherPropertyType.delete(propertyName);
      }
    }

    for (const [propertyName, count] of otherPropertyType.entries()) {
      if (count == others.length) {
        unique.push({kind: DiffKind.PROPERTY_TYPE, propertyName: propertyName});
      }
    }

    if (otherType == others.length) {
      // TODO: Does not need to have been a fundamental type diff, but do we need to care?
      unique.push({kind: DiffKind.TYPE, typeDiffs: [...otherDifferences]});
    }

    return unique;
  }

  public static mergeTypeMeta<T extends OmniType>(from: T, to: typeof from, lossless = true, aggregate = false): typeof to {

    to.title = to.title || from.title;

    if (aggregate && to.description && from.description) {
      to.description = `${to.description}, ${from.description}`;
    } else {
      to.description = to.description || from.description;
    }

    if (aggregate && to.summary && from.summary) {
      to.summary = `${to.summary}, ${from.summary}`;
    } else {
      to.summary = to.summary || from.summary;
    }

    to.examples = (to.examples ?? []).concat(from.examples || []);

    if (aggregate && to.debug && from.debug) {
      to.debug = `${to.debug}, ${from.debug}`;
    } else {
      to.debug = to.debug || from.debug;
    }

    if (from.accessLevel !== to.accessLevel) {
      if (lossless) {
        throw new Error(`Could not merge from ${OmniUtil.describe(from)} to ${OmniUtil.describe(to)} since access levels are different`);
      } else {
        to.accessLevel = Math.max(to.accessLevel ?? OmniAccessLevel.PRIVATE, from.accessLevel ?? OmniAccessLevel.PRIVATE);
      }
    }

    return to;
  }

  public static mergeTwoPropertiesAndAddToClassType(a: OmniProperty, b: OmniProperty, to: OmniObjectType): void {
    const common = OmniUtil.getCommonDenominatorBetween(a.type, b.type, OMNI_GENERIC_FEATURES)?.type;
    if (common) {
      if (to.properties) {
        const idx = to.properties.indexOf(b);
        if (idx !== -1) {
          to.properties.splice(idx, 1);
        }
      }
      OmniUtil.addPropertyToClassType(a, to, common);
    } else {

      // TODO: Can we introduce generics here in some way?
      const vsString = `${OmniUtil.describe(a.type)} vs ${OmniUtil.describe(b.type)}`;
      const errMessage = `No common type for merging properties ${a.name}. ${vsString}`;
      throw new Error(errMessage);
    }
  }

  public static addPropertyToClassType(property: OmniProperty, toType: OmniObjectType, as?: OmniType): void {

    if (!toType.properties) {
      toType.properties = [];
    }

    toType.properties.push({
      ...property,
      owner: toType,
      type: as || property.type,
    });
  }

  public static getPrimitiveNumberCoverageScore(kind: OmniPrimitiveKinds): number {

    switch (kind) {
      case OmniTypeKind.DECIMAL:
        return 7;
      case OmniTypeKind.DOUBLE:
        return 6;
      case OmniTypeKind.FLOAT:
        return 5;
      case OmniTypeKind.LONG:
        return 4;
      case OmniTypeKind.INTEGER:
        return 3;
      case OmniTypeKind.INTEGER_SMALL:
        return 2;
      case OmniTypeKind.NUMBER:
        return 1;
    }

    return 0;
  }

  public static isPropertyNameEqual(a: OmniPropertyName, b: OmniPropertyName): boolean {

    const aResolved = OmniUtil.getPropertyNameOrPattern(a);
    const bResolved = OmniUtil.getPropertyNameOrPattern(b);

    if (typeof aResolved === 'string' && typeof bResolved === 'string') {
      return aResolved === bResolved;
    } else {
      return false;
    }
  }

  public static isPropertyNameMatching(a: OmniPropertyName, b: OmniPropertyName): boolean {

    const aResolved = OmniUtil.getPropertyNameOrPattern(a);
    const bResolved = OmniUtil.getPropertyNameOrPattern(b);

    if (typeof aResolved === 'string') {
      if (typeof bResolved === 'string') {
        return aResolved === bResolved;
      } else {
        return bResolved.test(aResolved);
      }
    } else {
      if (typeof bResolved === 'string') {
        return aResolved.test(bResolved);
      } else {
        return aResolved.source === bResolved.source;
      }
    }
  }

  /**
   * Returns the serializable name of a property name, or undefined if the name is a regex pattern and cannot be properly translated to a name.
   */
  public static getPropertyName(name: OmniPropertyName, regexAcceptable: true): string;
  public static getPropertyName(name: OmniPropertyName, regexAcceptable?: boolean): string | undefined;
  public static getPropertyName(name: OmniPropertyName, regexAcceptable?: boolean): string | undefined {
    if (typeof name === 'string') {
      return name;
    } else {
      if (name.isPattern) {
        return regexAcceptable ? name.name.source : undefined;
      } else {
        return name.name;
      }
    }
  }

  public static getPropertyNameOrPattern(name: OmniPropertyName): string | RegExp {
    if (typeof name === 'string') {
      return name;
    } else {
      if (name.isPattern) {
        return name.name;
      } else {
        return name.name;
      }
    }
  }

  public static isPatternPropertyName(name: OmniPropertyName): name is OmniPropertyNamePattern {
    return typeof name === 'object' && name.isPattern === true;
  }

  public static getPropertyFieldName(name: OmniPropertyName, regexAcceptable: true): string;
  public static getPropertyFieldName(name: OmniPropertyName, regexAcceptable?: boolean): string | undefined;
  public static getPropertyFieldName(name: OmniPropertyName, regexAcceptable = false): string | undefined {

    if (typeof name === 'object') {
      if (!name.isPattern) {
        if (name.fieldName) {
          return name.fieldName;
        } else if (name.propertyName) {
          return name.propertyName;
        }
      }
    }

    return OmniUtil.getPropertyName(name, regexAcceptable);
  }

  public static getPropertyAccessorName(name: OmniPropertyName, regexAcceptable: true): string;
  public static getPropertyAccessorName(name: OmniPropertyName, regexAcceptable?: boolean): string | undefined;
  public static getPropertyAccessorName(name: OmniPropertyName, regexAcceptable = false): string | undefined {

    if (typeof name === 'object') {
      if (!name.isPattern) {
        if (name.propertyName) {
          return name.propertyName;
        } else if (name.fieldName) {
          return name.fieldName;
        }
      }
    }

    return OmniUtil.getPropertyName(name, regexAcceptable);
  }

  public static getPropertyAccessorNameOnly(name: OmniPropertyName): string | undefined {

    if (typeof name === 'object' && !name.isPattern && name.propertyName) {
      return name.propertyName;
    }

    return undefined;
  }

  public static getPropertyFieldNameOnly(name: OmniPropertyName): string | undefined {

    if (typeof name === 'object' && !name.isPattern && name.fieldName) {
      return name.fieldName;
    }

    return undefined;
  }

  public static getPropertyNamePattern(name: OmniPropertyName): string | undefined {
    if (typeof name === 'object') {
      if (name.isPattern) {
        return name.name.source;
      }
    }

    return undefined;
  }

  public static isIdentifiable(type: OmniType): type is typeof type & OmniOptionallyNamedType {

    if ('name' in type) {
      return true;
    }

    return (OmniUtil.isComposition(type) || type.kind == OmniTypeKind.DECORATING || type.kind == OmniTypeKind.INTERFACE);
  }

  public static isUnion<T extends OmniType>(type: OmniType | undefined): type is OmniTypeOf<T, typeof OmniTypeKind.EXCLUSIVE_UNION | typeof OmniTypeKind.UNION> {

    if (!type) {
      return false;
    }

    switch (type.kind) {
      case OmniTypeKind.UNION:
      case OmniTypeKind.EXCLUSIVE_UNION:
        return true;
      default:
        return false;
    }
  }

  public static isComposition<T extends OmniType>(type: OmniType | undefined): type is OmniTypeOf<T, OmniKindComposition> {

    if (!type) {
      return false;
    }

    switch (type.kind) {
      case OmniTypeKind.UNION:
      case OmniTypeKind.EXCLUSIVE_UNION:
      case OmniTypeKind.INTERSECTION:
      case OmniTypeKind.NEGATION:
        return true;
      default:
        return false;
    }
  }

  public static isPrimitive<T extends OmniType>(type: T | undefined): type is OmniTypeOf<T, OmniPrimitiveKinds> {

    if (!type) {
      return false;
    }

    switch (type.kind) {
      case OmniTypeKind.NUMBER:
      case OmniTypeKind.INTEGER:
      case OmniTypeKind.INTEGER_SMALL:
      case OmniTypeKind.DECIMAL:
      case OmniTypeKind.DOUBLE:
      case OmniTypeKind.FLOAT:
      case OmniTypeKind.LONG:
      case OmniTypeKind.STRING:
      case OmniTypeKind.CHAR:
      case OmniTypeKind.BOOL:
      case OmniTypeKind.VOID:
      case OmniTypeKind.NULL:
      case OmniTypeKind.UNDEFINED:
        return true;
      default:
        return false;
    }
  }
}

export type Diff =
  PropertyDiff
  | PropertyTypeDiff
  | TypeDiff;

export interface BaseDiff<K extends DiffKind> {
  kind: K;
}

export enum DiffKind {
  TYPE = 'TYPE',
  MISSING_PROPERTY = 'MISSING_PROPERTY',
  EXTRA_PROPERTY = 'EXTRA_PROPERTY',
  PROPERTY_TYPE = 'PROPERTY_TYPE',
}

export interface TypeDiff extends BaseDiff<DiffKind.TYPE> {
  typeDiffs: TypeDiffKind[];
}

export interface PropertyDiff extends BaseDiff<DiffKind.MISSING_PROPERTY | DiffKind.EXTRA_PROPERTY> {
  propertyName: string;
}

export interface PropertyTypeDiff extends BaseDiff<DiffKind.PROPERTY_TYPE> {
  propertyName: string;
}
