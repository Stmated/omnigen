import {
  CompositionKind, OMNI_GENERIC_FEATURES,
  OmniArrayPropertiesByPositionType,
  OmniArrayType,
  OmniCompositionType,
  OmniDictionaryType,
  OmniEnumType,
  OmniExternalModelReferenceType,
  OmniGenericSourceType,
  OmniGenericTargetIdentifierType,
  OmniGenericTargetType,
  OmniHardcodedReferenceType,
  OmniInput,
  OmniModel,
  OmniObjectType,
  OmniOutput,
  OmniPrimitiveConstantValue,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniProperty,
  OmniPropertyOwner,
  OmniSubTypeCapableType,
  OmniSuperGenericTypeCapableType,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  SmartUnwrappedType,
  TypeName,
  UnknownKind,
} from '@omnigen/core';
import {LiteralValue} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';
import {CommonDenominatorType} from '@omnigen/core';
import {PropertyUtil} from './PropertyUtil.js';
import {TargetFeatures} from '@omnigen/core';
import {PropertyDifference, TypeDifference, TypeOwner} from '@omnigen/core';
import {BFSTraverseCallback, BFSTraverseContext, DFSTraverseCallback, OmniTypeVisitor} from './OmniTypeVisitor.js';
import {Naming} from './Naming.js';

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
    input: TypeOwner<OmniType> | undefined,
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
    input: TypeOwner<OmniType> | undefined,
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

    if (ctx.type.kind == OmniTypeKind.DECORATING) {

      // We do not add the decorating type itself
      return;
    }

    set.add(ctx.type);
    if (ctx.typeDepth == 0) {
      setEdge.add(ctx.type);
    }
  }

  public static isGenericAllowedType(type: OmniType): boolean {
    if (type.kind == OmniTypeKind.PRIMITIVE) {

      // TODO: This is specific to some languages, and should not be inside OmniUtil
      if (type.primitiveKind == OmniPrimitiveKind.STRING) {
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

  public static asSubType(type: OmniType | undefined): OmniSubTypeCapableType | undefined {

    if (!type) {
      return undefined;
    }

    if (type.kind == OmniTypeKind.OBJECT || type.kind == OmniTypeKind.ENUM || type.kind == OmniTypeKind.INTERFACE) {
      return type;
    }

    return undefined;

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

  public static asSuperType(type: OmniType | undefined): OmniSuperTypeCapableType | undefined {

    if (!type) {
      return undefined;
    }

    if (type.kind == OmniTypeKind.OBJECT
      || type.kind == OmniTypeKind.GENERIC_TARGET
      || type.kind == OmniTypeKind.ENUM
      || type.kind == OmniTypeKind.INTERFACE
      || type.kind == OmniTypeKind.HARDCODED_REFERENCE) {
      return type;
    }

    if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      const of = OmniUtil.asSuperType(type.of);
      if (of) {

        // NOTE: This cast should not exist here, work needs to be done to make this all-the-way generic.
        return type as OmniExternalModelReferenceType<OmniSubTypeCapableType>;
      } else {
        return undefined;
      }
    }

    if (type.kind == OmniTypeKind.COMPOSITION) {

      // This seems like an unnecessary operation to do, but cannot figure out a better way yet.
      const childSuperTypes = type.types.map(it => OmniUtil.asSuperType(it));
      if (childSuperTypes.includes(undefined)) {

        // This might seem confusing, when you call "asSuperType" on a composition but get back undefined.
        // This method is supposed to be safe to call with anything though, but we log this occasion.
        logger.debug(`There is a non-supertype type inside composition ${OmniUtil.describe(type)}`);
        return undefined;
      }

      return type as OmniCompositionType<OmniSuperTypeCapableType>;
    }

    return undefined;
  }

  /**
   * Not recursive
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

    if (type.kind == OmniTypeKind.COMPOSITION) {

      if (type.compositionKind == CompositionKind.AND) {
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
      if (unwrapped.extendedBy) {
        if (unwrapped.extendedBy.kind == OmniTypeKind.COMPOSITION) {
          if (unwrapped.extendedBy.compositionKind == CompositionKind.AND) {
            return unwrapped.extendedBy.types;
          }
        } else {
          return [unwrapped.extendedBy];
        }
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
      const subType = OmniUtil.getUnwrappedType(OmniUtil.asSubType(ctx.type));
      if (!subType) {
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
    while (queue.length > 0) {

      const dequeued = queue.pop();
      const superTypes = OmniUtil.getSuperTypes(model, dequeued);
      if (superTypes) {
        path.push(...superTypes);
        for (const superType of superTypes) {
          const superAsSub = OmniUtil.asSubType(superType);
          if (superAsSub) {
            queue.push(superAsSub);
          }
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

  public static hasAdditionalProperties(type: OmniObjectType): boolean {
    return (type.additionalProperties != undefined && type.additionalProperties);
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
      if (type.properties.length == 0 && !OmniUtil.hasAdditionalProperties(type)) { // (type.additionalProperties == undefined || !type.additionalProperties)) {
        return true;
      }
    }

    return false;
  }

  public static isNull(type: OmniType): boolean {

    if (type.kind != OmniTypeKind.PRIMITIVE) {
      return false;
    }

    return type.primitiveKind == OmniPrimitiveKind.NULL;
  }

  /**
   * Returns a general name for the primitive.
   * Does not translate into the actual target language's primitive type.
   * Is used for generating property names or used in general logging.
   *
   * @param kind
   * @param nullable
   */
  public static getVirtualPrimitiveKindName(kind: OmniPrimitiveKind, nullable: boolean): string {

    switch (kind) {
      case OmniPrimitiveKind.BOOL:
        return nullable ? 'Boolean' : 'bool';
      case OmniPrimitiveKind.VOID:
        return 'void';
      case OmniPrimitiveKind.CHAR:
        return nullable ? 'Character' : 'char';
      case OmniPrimitiveKind.STRING:
        return nullable ? 'String' : 'string';
      case OmniPrimitiveKind.FLOAT:
        return nullable ? 'Float' : 'float';
      case OmniPrimitiveKind.INTEGER:
        return nullable ? 'Integer' : 'int';
      case OmniPrimitiveKind.INTEGER_SMALL:
        return nullable ? 'Short' : 'short';
      case OmniPrimitiveKind.LONG:
        return nullable ? 'Long' : 'long';
      case OmniPrimitiveKind.DECIMAL:
        return nullable ? 'Decimal' : 'decimal';
      case OmniPrimitiveKind.DOUBLE:
        return nullable ? 'Double' : 'double';
      case OmniPrimitiveKind.NUMBER:
        return nullable ? 'Number' : 'number';
      case OmniPrimitiveKind.NULL:
        return 'null';
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
      return `[${type.placeholderName}: lower(${OmniUtil.describe(type.lowerBound)}),  upper(${OmniUtil.describe(type.upperBound)})]`;
    } else if (type.kind == OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
      if (type.placeholderName) {
        return `[${OmniUtil.describe(type.type)} as ${type.placeholderName} for ${type.sourceIdentifier.placeholderName}]`;
      } else {
        return `[${OmniUtil.describe(type.type)} as ${type.sourceIdentifier.placeholderName}]`;
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

    if (type.kind == OmniTypeKind.PRIMITIVE) {
      let suffix = '';

      if (type.value) {
        const resolvedString = OmniUtil.primitiveConstantValueToString(type.value);
        suffix = `=${resolvedString}`;
      }

      if (type.nullable) {
        return `${baseName} [${type.kind} - nullable${suffix}]`;
      } else if (!type.nullable) {
        return `${baseName} [${type.kind} - non-nullable${suffix}]`;
      }
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

  public static isNullableType(type: OmniType): boolean {

    if (type.kind == OmniTypeKind.PRIMITIVE) {
      if (type.primitiveKind == OmniPrimitiveKind.NULL || type.primitiveKind == OmniPrimitiveKind.VOID) {
        return true;
      }

      // In some languages a string is always nullable, but that is up to the target language to handle somehow.
      return type.nullable ?? false;
    }

    return true;
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
    } else if (type.kind == OmniTypeKind.PRIMITIVE) {
      return OmniUtil.getVirtualPrimitiveKindName(type.primitiveKind, OmniUtil.isNullableType(type));
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
      return `Decorated${OmniUtil.getVirtualTypeName(type.of)}`;
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
    } else if (type.kind == OmniTypeKind.COMPOSITION) {
      return `Composition${type.compositionKind}(${type.types.map(it => OmniUtil.getVirtualTypeName(it)).join(',')})`;
    }

    const typeName = OmniUtil.getTypeName(type);
    if (typeName) {
      return typeName;
    }

    // TODO: All types should be able to return a "virtual" type name, which can be used for compositions or whatever!
    throw new Error(`[ERROR: ADD VIRTUAL TYPE NAME FOR ${String(type.kind)}]`);
  }

  public static toReferenceType<T extends OmniType>(type: T): T {
    // NOTE: If changed, make sure isNullable is updated
    if (type.kind == OmniTypeKind.PRIMITIVE) {

      if (type.primitiveKind == OmniPrimitiveKind.STRING
        || type.primitiveKind == OmniPrimitiveKind.NULL
        || type.primitiveKind == OmniPrimitiveKind.VOID) {

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
    parent: TypeOwner<OmniType>,
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
      case OmniTypeKind.COMPOSITION: {
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
          const decrementDepthBy = (parent.extendedBy.kind == OmniTypeKind.COMPOSITION) ? 0 : 1;
          const found = OmniUtil.swapType(parent.extendedBy, from, to, maxDepth - decrementDepthBy);
          if (found) {
            const inheritableReplacement = OmniUtil.asSuperType(to);
            if (inheritableReplacement) {
              parent.extendedBy = inheritableReplacement;
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
          const inheritableReplacement = OmniUtil.asSuperType(to);
          if (inheritableReplacement) {
            parent.of = inheritableReplacement;
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
          } else if (found.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE && found.of.kind == OmniTypeKind.GENERIC_SOURCE) {
            parent.source = found as OmniExternalModelReferenceType<OmniGenericSourceType>;
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
      case OmniTypeKind.ARRAY_TYPES_BY_POSITION: {
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

  public static isDisqualifyingDiffForCommonType(diffs?: TypeDifference[]): boolean {

    if (diffs) {
      if (diffs.includes(TypeDifference.FUNDAMENTAL_TYPE)) {
        return true;
      }
    }

    return false;
  }

  public static getDiffAmount(diffs?: TypeDifference[]): number {

    if (diffs) {
      if (diffs.includes(TypeDifference.FUNDAMENTAL_TYPE)) {
        return 10;
      } else if (diffs.includes(TypeDifference.ISOMORPHIC_TYPE)) {
        return 9;
      } else if (diffs.includes(TypeDifference.NARROWED_LITERAL_TYPE)) {
        return 8;
      } else if (diffs.includes(TypeDifference.NO_GENERIC_OVERLAP)) {
        return 7;
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

  public static getCommonDenominator(targetFeatures: TargetFeatures, ...types: OmniType[]): CommonDenominatorType<OmniType> | undefined {

    if (types.length == 1) {
      return {
        type: types[0],
      };
    }

    let commonDiffAmount = 0;
    let common: CommonDenominatorType<OmniType> = {
      type: types[0],
    };

    for (let i = 1; i < types.length; i++) {

      const denominator = OmniUtil.getCommonDenominatorBetween(common.type, types[i], targetFeatures);
      if (!denominator || OmniUtil.isDisqualifyingDiffForCommonType(denominator.diffs)) {
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
   * @param a First type to compare with
   * @param b Second type to compare to
   * @param targetFeatures Description ont eh features that the caller supports, so we can know what it can do
   * @param create True if a new type should be created and returned, if common denominator can be achieved that way
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

    if (a.kind == OmniTypeKind.PRIMITIVE && b.kind == OmniTypeKind.PRIMITIVE) {
      return this.getCommonDenominatorBetweenPrimitives(a, b, targetFeatures, create);
    } else if (a.kind == OmniTypeKind.HARDCODED_REFERENCE && b.kind == OmniTypeKind.HARDCODED_REFERENCE) {
      return this.getCommonDenominatorBetweenHardcodedReferences(a, b);
    } else if (a.kind == OmniTypeKind.ENUM && b.kind == OmniTypeKind.ENUM) {
      // TODO: This can probably be VERY much improved -- like taking the entries that are similar between the two
      return this.getCommonDenominatorBetweenEnums(a, b);
    } else if (a.kind == OmniTypeKind.DICTIONARY && b.kind == OmniTypeKind.DICTIONARY) {
      return this.getCommonDenominatorBetweenDictionaries(a, b, targetFeatures, create);
    } else if (a.kind == OmniTypeKind.ARRAY && b.kind == OmniTypeKind.ARRAY) {
      return this.getCommonDenominatorBetweenArrays(a, b, targetFeatures, create);
    } else if (a.kind == OmniTypeKind.UNKNOWN && b.kind == OmniTypeKind.UNKNOWN) {
      return {type: a};
    } else if (a.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION && b.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      return this.getCommonDenominatorBetweenPropertiesByPosition(a, b, targetFeatures, create);
    } else if (a.kind == OmniTypeKind.OBJECT && b.kind == OmniTypeKind.OBJECT) {
      const result = this.getCommonDenominatorBetweenObjects(a, b, targetFeatures, create);
      if (result) {
        return result;
      }
    }

    if (a.kind == OmniTypeKind.OBJECT || b.kind == OmniTypeKind.OBJECT) {
      return this.getCommonDenominatorBetweenObjectAndOther(a, b, targetFeatures, create);
    } else if (a.kind == OmniTypeKind.COMPOSITION) {
      // TODO: Do something here. There might be parts of 'a' and 'b' that are similar.
      // TODO: Should we then create a new composition type, or just return the first match?
    } else if (a.kind == OmniTypeKind.GENERIC_TARGET) {
      if (b.kind == OmniTypeKind.GENERIC_TARGET) {
        return this.getCommonDenominatorBetweenGenericTargets(a, b, targetFeatures, create);
      }
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

    const uniqueDiffs = new Set<TypeDifference>();
    for (const match of matching) {

      let commonIdentifierType = OmniUtil.getCommonDenominatorBetween(match.a.type, match.b.type, targetFeatures, create);
      if (!commonIdentifierType) {

        // The source is the same, the identifiers are the same, but there is no common type between them.
        // But in almost all languages then, we want the generic type to be "?" or "any" or similar.
        // We might want to change this depending on language, but that's a later problem.
        commonIdentifierType = {
          type: {kind: OmniTypeKind.UNKNOWN},
          diffs: [TypeDifference.NO_GENERIC_OVERLAP],
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

      // lowestEqualityLevel = commonIdentifierType.grades.min(lowestEqualityLevel); // Math.min(lowestEqualityLevel, commonIdentifierType.equalityGrade);
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
          diffs: [...(common.diffs ?? []), TypeDifference.IS_SUPERTYPE],
        };
      }
    }

    if (a.kind == OmniTypeKind.OBJECT && a.extendedBy) {
      const common = OmniUtil.getCommonDenominatorBetween(a.extendedBy, b, targetFeatures, create);
      if (common) {

        return {
          type: common.type,
          diffs: [...(common.diffs ?? []), TypeDifference.IS_SUPERTYPE],
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
      diffs: [TypeDifference.FUNDAMENTAL_TYPE],
    };
  }

  private static getCommonDenominatorBetweenPropertiesByPosition(
    a: OmniArrayPropertiesByPositionType,
    b: OmniArrayPropertiesByPositionType,
    targetFeatures: TargetFeatures,
    create?: boolean,
  ): CommonDenominatorType<OmniArrayPropertiesByPositionType> | undefined {

    if (a.properties.length === b.properties.length) {

      const diffs: TypeDifference[] = [];
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

    if (a.primitiveKind == b.primitiveKind && a.nullable == b.nullable && a.value == b.value && a.literal == b.literal) {
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
        if (nullableType.kind == OmniTypeKind.PRIMITIVE) {
          common.type = nullableType;
          common.diffs = [...(common.diffs ?? []), TypeDifference.NULLABILITY];
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
      const newTypeDifference = (targetFeatures.literalTypes) ? TypeDifference.FUNDAMENTAL_TYPE : TypeDifference.NARROWED_LITERAL_TYPE;
      return {type: OmniUtil.getGeneralizedType(common.type ?? a), diffs: [...(common.diffs ?? []), newTypeDifference]};
    } else if (a.literal && !b.literal && common.type == a) {
      return {type: b, diffs: [...(common.diffs ?? []), TypeDifference.NARROWED_LITERAL_TYPE]};
    } else if (!a.literal && b.literal && common.type == b) {
      return {type: a, diffs: [...(common.diffs ?? []), TypeDifference.NARROWED_LITERAL_TYPE]};
    }

    return {type: OmniUtil.getGeneralizedType(common.type ?? a), diffs: [...(common.diffs ?? []), TypeDifference.NARROWED_LITERAL_TYPE]};
  }

  private static getCommonDenominatorBetweenPrimitiveKinds(
    a: OmniPrimitiveType,
    b: OmniPrimitiveType,
  ): CommonDenominatorType<OmniPrimitiveType | undefined> | undefined {

    if (a.primitiveKind == b.primitiveKind) {
      // The type being undefined means that we have no preference over a or b
      return {type: undefined};
    }

    switch (a.primitiveKind) {
      case OmniPrimitiveKind.INTEGER:
      case OmniPrimitiveKind.INTEGER_SMALL:
        switch (b.primitiveKind) {
          case OmniPrimitiveKind.LONG:
          case OmniPrimitiveKind.DOUBLE:
          case OmniPrimitiveKind.FLOAT:
          case OmniPrimitiveKind.DECIMAL:
            return {
              type: b,
              diffs: [TypeDifference.ISOMORPHIC_TYPE],
            };
        }
        break;
      case OmniPrimitiveKind.LONG:
        switch (b.primitiveKind) {
          case OmniPrimitiveKind.DOUBLE:
          case OmniPrimitiveKind.FLOAT:
          case OmniPrimitiveKind.DECIMAL:
            return {
              type: b,
              diffs: [TypeDifference.ISOMORPHIC_TYPE],
            };
        }
        break;
      case OmniPrimitiveKind.FLOAT:
        switch (b.primitiveKind) {
          case OmniPrimitiveKind.DOUBLE:
          case OmniPrimitiveKind.DECIMAL:
            return {
              type: b,
              diffs: [TypeDifference.ISOMORPHIC_TYPE],
            };
        }
        break;
      case OmniPrimitiveKind.DECIMAL:
        switch (b.primitiveKind) {
          case OmniPrimitiveKind.DOUBLE:
            return {
              type: b,
              diffs: [TypeDifference.ISOMORPHIC_TYPE],
            };
        }
        break;
      case OmniPrimitiveKind.NUMBER:
        switch (b.primitiveKind) {
          case OmniPrimitiveKind.INTEGER:
          case OmniPrimitiveKind.INTEGER_SMALL:
          case OmniPrimitiveKind.LONG:
          case OmniPrimitiveKind.DOUBLE:
          case OmniPrimitiveKind.FLOAT:
          case OmniPrimitiveKind.DECIMAL:
            return {
              type: a,
              diffs: [TypeDifference.ISOMORPHIC_TYPE],
            };
        }
        break;
      case OmniPrimitiveKind.CHAR:
        switch (b.primitiveKind) {
          case OmniPrimitiveKind.STRING:
            return {
              type: b,
              diffs: [TypeDifference.ISOMORPHIC_TYPE],
            };
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
    allowedDiffPredicate: (diff: TypeDifference) => boolean = () => false,
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

  public static getGeneralizedType<T extends OmniType>(type: T): T {

    if (type.kind == OmniTypeKind.PRIMITIVE) {
      if (type.value !== undefined) {

        const generalizedPrimitive: T = {
          ...type,
        };
        delete (generalizedPrimitive as any).value;
        delete (generalizedPrimitive as any).literal;

        return generalizedPrimitive;
      }
    }

    return type;
  }

  public static isDiffMatch(diffs: TypeDifference[] | undefined, ...matches: TypeDifference[]): boolean {

    if (diffs) {

      for (const needle of matches) {
        if (diffs.includes(needle)) {
          return true;
        }

        if (needle == TypeDifference.NARROWED_LITERAL_TYPE) {
          if (diffs.includes(TypeDifference.FUNDAMENTAL_TYPE) || diffs.includes(TypeDifference.ISOMORPHIC_TYPE)) {
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
  ): CommonDenominatorType<OmniType> | undefined {

    if (a.properties.length != b.properties.length) {
      return undefined;
    }

    if (a.additionalProperties != b.additionalProperties) {
      return undefined;
    }

    if (a.extendedBy !== b.extendedBy) {
      return undefined;
    }

    const diffs: TypeDifference[] = [];
    for (let i = 0; i < a.properties.length; i++) {
      // TODO: Move all the common denominator stuff out to a separate class (it's taking too much space here)
      const equality = PropertyUtil.getPropertyEquality(a.properties[i], b.properties[i], targetFeatures);

      if (OmniUtil.isDiffMatch(equality.typeDiffs, TypeDifference.NARROWED_LITERAL_TYPE)) {
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

      // The names need to be the same for now.
      // TODO: Should make this an option, to allow differing names if the semantic similarity is high enough.
      // if (commonSuperType) {
      //   return {type: commonSuperType.type, diffs: [TypeDifference.NAME, ...(commonSuperType.diffs ?? [])]};
      // } else {
      return undefined;
      // }
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

  public static mergeType<T extends OmniType>(from: T, to: T, lossless = true): T {

    if (from.kind == OmniTypeKind.OBJECT && to.kind == OmniTypeKind.OBJECT) {

      for (const fromProperty of (from.properties || [])) {
        const toProperty = to.properties?.find(p => p.name == fromProperty.name);
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
}
