import {
  CompositionKind,
  Naming,
  OmniArrayPropertiesByPositionType,
  OmniArrayType,
  OmniCompositionType,
  OmniDictionaryType,
  OmniExternalModelReferenceType,
  OmniGenericTargetIdentifierType,
  OmniGenericTargetType,
  OmniInput,
  OmniModel,
  OmniObjectType,
  OmniOutput,
  OmniPrimitiveConstantValue,
  OmniPrimitiveConstantValueOrLazySubTypeValue,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniProperty,
  OmniPropertyOwner,
  OmniSubtypeCapableType,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  PrimitiveNullableKind,
  SmartUnwrappedType,
  TypeName,
} from '../parse';
import {LiteralValue} from './LiteralValue';
import {LoggerFactory} from '@omnigen/core-log';
import {BFSTraverseCallback, DFSTraverseCallback, OmniTypeVisitor} from './OmniTypeVisitor';
import {CommonDenominatorType} from './CommonDenominatorType';
import {EqualityLevel} from './EqualityLevel';
import {PropertyUtil} from './PropertyUtil';

const logger = LoggerFactory.create(__filename);

export interface TypeCollection {

  named: OmniType[];
  all: OmniType[];
  edge: OmniType[];
}

type TargetIdentifierTuple = { a: OmniGenericTargetIdentifierType, b: OmniGenericTargetIdentifierType };

// NOTE: Perhaps the TraverseInput and TraverseParent should be able to be OmniModel (etc) as well?

export type TypeOwner<T extends OmniType> = T | OmniModel | OmniInput | OmniOutput | OmniProperty;

export class OmniUtil {

  public static visitTypesDepthFirst<R>(
    input: TypeOwner<OmniType> | undefined,
    onDown?: DFSTraverseCallback<R>,
    onUp?: DFSTraverseCallback<R>,
  ): R | undefined {
    return new OmniTypeVisitor().visitTypesDepthFirst(input, onDown, onUp);
  }

  public static visitTypesBreadthFirst<R>(
    input: TypeOwner<OmniType> | undefined,
    onDown: BFSTraverseCallback<R>,
    visitOnce = true,
  ): R | undefined {
    return new OmniTypeVisitor().visitTypesBreadthFirst(input, onDown, visitOnce);
  }

  public static getAllExportableTypes(model: OmniModel, refTypes?: OmniType[]): TypeCollection {

    // TODO: Should be an option to do a deep dive or a quick dive!
    const set = new Set<OmniType>();
    const setEdge = new Set<OmniType>();
    if (refTypes) {
      for (const refType of refTypes) {

        OmniUtil.visitTypesBreadthFirst(refType, ctx => {

          set.add(ctx.type);
          if (ctx.typeDepth == 0) {
            setEdge.add(ctx.type);
          }
        });
      }
    }

    OmniUtil.visitTypesBreadthFirst(model, ctx => {
      if (set.has(ctx.type)) {
        ctx.skip = true;
        return;
      }

      set.add(ctx.type);
      if (ctx.typeDepth == 0) {
        setEdge.add(ctx.type);
      }
    });

    return {
      all: [...set],
      edge: [...setEdge],
      named: [],
    };
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

  public static isAssignableTo(type: OmniType | undefined, needle: OmniType): boolean {

    return OmniUtil.visitTypesDepthFirst(type, ctx => {

      if (ctx.type.kind == OmniTypeKind.GENERIC_TARGET) {
        ctx.skip = true;
        return;
      }

      if (ctx.type == needle) {
        return true;
      }

      return;
    }) || false;
  }

  /**
   * Resolves the type into its edge type, that is the innermost type that contains the functionality of the type.
   * The returned type can be a completely other type than the given one, following interface and/or external references.
   *
   * @param type what to resolve
   */
  public static getResolvedEdgeType(type: OmniType): OmniType {

    const unwrappedType = OmniUtil.getUnwrappedType(type);
    if (unwrappedType.kind == OmniTypeKind.ARRAY) {
      return OmniUtil.getResolvedEdgeType(unwrappedType.of);
    }

    if (unwrappedType.kind == OmniTypeKind.INTERFACE) {
      // NOTE: Should this be included?
      return OmniUtil.getResolvedEdgeType(unwrappedType.of);
    }

    return unwrappedType;
  }

  /**
   * Gets the actual type of the given type, giving back the first type that is not a hollow reference to another type.
   * The returned type might not be located in the same model as the given type.
   *
   * @param type what to unwrap
   */
  public static getUnwrappedType<T extends OmniType | undefined>(type: T): SmartUnwrappedType<T> {

    if (type && type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return OmniUtil.getUnwrappedType(type.of) as SmartUnwrappedType<T>;
    }

    return type as SmartUnwrappedType<T>;
  }

  public static asSubType(type: OmniType | undefined): OmniSubtypeCapableType | undefined {

    if (!type) {
      return undefined;
    }

    if (type.kind == OmniTypeKind.OBJECT || type.kind == OmniTypeKind.ENUM || type.kind == OmniTypeKind.INTERFACE) {
      return type;
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
      || type.kind == OmniTypeKind.INTERFACE) {
      return type;
    }

    if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      const of = OmniUtil.asSuperType(type.of);
      if (of) {

        // NOTE: This cast should not exist here, work needs to be done to make this all-the-way generic.
        return type as OmniExternalModelReferenceType<OmniSubtypeCapableType>;
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

      return type as OmniCompositionType<OmniSuperTypeCapableType, CompositionKind>;
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

  public static getSuperTypes(_model: OmniModel, type: OmniSubtypeCapableType | undefined): OmniSuperTypeCapableType[] {

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
  public static getSubTypeToSuperTypesMap(model: OmniModel): Map<OmniSubtypeCapableType, OmniSuperTypeCapableType[]> {

    const map = new Map<OmniSubtypeCapableType, OmniSuperTypeCapableType[]>();
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
  public static getSuperTypeToSubTypesMap(model: OmniModel): Map<OmniSuperTypeCapableType, OmniSubtypeCapableType[]> {

    // We just take the sub-to-super map and flip it around.
    const subToSuperMap = OmniUtil.getSubTypeToSuperTypesMap(model);
    const superToSubMap = new Map<OmniSuperTypeCapableType, OmniSubtypeCapableType[]>();
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
  public static getSuperTypeHierarchy(model: OmniModel, type: OmniSubtypeCapableType | undefined): OmniSuperTypeCapableType[] {

    const path: OmniSuperTypeCapableType[] = [];
    if (!type) {
      return path;
    }

    const queue: OmniSubtypeCapableType[] = [type];
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

  /**
   * Does not take into account any type that this type extends from.
   * Only checks the direct type, if it is empty and could in theory be removed.
   *
   * @param type The generic type to check if it counts as empty.
   * @returns true if the type counts as empty, otherwise false.
   */
  public static isEmptyType(type: OmniType): boolean {

    if (type.kind == OmniTypeKind.OBJECT) {
      if (type.properties.length == 0 && (type.additionalProperties == undefined || !type.additionalProperties)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns a general name for the primitive.
   * Does not translate into the actual target language's primitive type.
   * Is used for generating property names or used in general logging.
   *
   * @param kind
   * @param nullable
   */
  public static getPrimitiveKindName(kind: OmniPrimitiveKind, nullable: boolean): string {

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
    }
  }

  public static isNullable(nullableKind: PrimitiveNullableKind | undefined): boolean {
    return (nullableKind == PrimitiveNullableKind.NULLABLE);
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

    const baseName = Naming.unwrap(OmniUtil.getVirtualTypeName(type));
    if (type.kind == OmniTypeKind.PRIMITIVE) {
      if (type.valueConstant) {
        const resolved = OmniUtil.resolvePrimitiveConstantValue(type.valueConstant, type);
        const resolvedString = OmniUtil.primitiveConstantValueToString(resolved);
        return `[${baseName}=${resolvedString}]`;
      }
    } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
      return `${baseName}<${type.sourceIdentifiers.map(identifier => OmniUtil.describe(identifier))}>`;
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

  public static resolvePrimitiveConstantValue(
    value: OmniPrimitiveConstantValueOrLazySubTypeValue,
    subType: OmniType,
  ): OmniPrimitiveConstantValue {

    if (typeof value == 'function') {
      return value(subType); // TODO: Check if this is correct
    } else {
      return value;
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
      return OmniUtil.getTypeName(type.of);
    } else if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return OmniUtil.getTypeName(type.of);
    }

    return undefined;
  }

  public static getVirtualTypeName(type: OmniType): TypeName {

    const typeName = OmniUtil.getTypeName(type);
    if (typeName) {
      return typeName;
    } else if (type.kind == OmniTypeKind.ARRAY) {
      return {
        prefix: 'ArrayOf',
        name: OmniUtil.getVirtualTypeName(type.of),
      };
    } else if (type.kind == OmniTypeKind.PRIMITIVE) {
      const nullable = OmniUtil.isNullable(type.nullable);
      return OmniUtil.getPrimitiveKindName(type.primitiveKind, nullable);
    } else if (type.kind == OmniTypeKind.UNKNOWN) {
      if (type.valueConstant != undefined) {
        return OmniUtil.primitiveConstantValueToString(type.valueConstant);
      }
      if (type.isAny) {
        return '_any';
      }
      return '_unknown';
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
        name: OmniUtil.getVirtualTypeName(type),
        suffix: `<${genericTypeString}>`,
      };
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
    }

    // TODO: All types should be able to return a "virtual" type name, which can be used for compositions or whatever!
    return `[ERROR: ADD VIRTUAL TYPE NAME FOR ${String(type.kind)}]`;
  }

  public static toGenericAllowedType(type: OmniType, wrap: boolean): OmniType {
    // Same thing for now, might change in the future.
    return OmniUtil.toNullableType(type, wrap);
  }

  public static toNullableType<T extends OmniType>(type: T, wrap: boolean): T | OmniPrimitiveType {
    // NOTE: If changed, make sure isNullable is updated
    if (type.kind == OmniTypeKind.PRIMITIVE) {
      if (type.nullable || type.primitiveKind == OmniPrimitiveKind.STRING) {
        return type;
      }

      const nullablePrimitive: OmniPrimitiveType = {
        ...type,
        nullable: (wrap ? PrimitiveNullableKind.NOT_NULLABLE_PRIMITIVE : PrimitiveNullableKind.NULLABLE),
      };

      return nullablePrimitive;
    }

    return type;
  }

  /**
   * Iterates through a type and all its related types, and replaces all found needles with the given replacement.
   *
   * If a type is returned from this method, then it is up to the caller to replace the type relative to the root's owner.
   *
   * TODO: Implement a general way of traversing all the types, so we do not need to duplicate this functionality everywhere!
   * TODO: This feels very inefficient right now... needs a very good revamp
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
        const inheritableReplacement = OmniUtil.asSuperType(to);
        if (inheritableReplacement) {
          const found = OmniUtil.swapType(parent.of, from, inheritableReplacement, maxDepth - 1);
          if (found) {
            parent.of = inheritableReplacement;
          }
        } else {
          throw new Error(`Cannot replace, since the interface requires a replacement that is inheritable`);
        }
        break;
      }
      case OmniTypeKind.GENERIC_TARGET: {
        for (let i = 0; i < parent.targetIdentifiers.length; i++) {
          const identifier = parent.targetIdentifiers[i];
          const found = OmniUtil.swapType(identifier.type, from, to, maxDepth - 1);
          if (found) {
            identifier.type = found;
          }
        }

        const found = OmniUtil.swapType(parent.source, from, to, maxDepth - 1);
        if (found) {
          if (found.kind == OmniTypeKind.GENERIC_SOURCE) {
            parent.source = found;
          } else {
            throw new Error(`Cannot replace, since it must be a generic source`);
          }
        }
        break;
      }
      case OmniTypeKind.GENERIC_SOURCE: {
        for (let i = 0; i < parent.sourceIdentifiers.length; i++) {
          const identifier = parent.sourceIdentifiers[i];
          if (identifier.lowerBound) {
            const found = OmniUtil.swapType(identifier.lowerBound, from, to, maxDepth - 1);
            if (found) {
              identifier.lowerBound = found;
            }
          }
          if (identifier.upperBound) {
            const found = OmniUtil.swapType(identifier.upperBound, from, to, maxDepth - 1);
            if (found) {
              identifier.upperBound = found;
            }
          }
        }

        const found = OmniUtil.swapType(parent.of, from, to, maxDepth - 1);
        if (found) {
          if (found.kind == OmniTypeKind.OBJECT) {
            parent.of = found;
          } else {
            throw new Error(`Cannot replace, since the replacement has to be an object`);
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

  public static getCommonDenominator(...types: OmniType[]): CommonDenominatorType<OmniType> | undefined {

    let lowestEqualityLevel: EqualityLevel = EqualityLevel.CLONE_MIN;
    let common: OmniType | undefined = types[0];
    for (let i = 1; i < types.length; i++) {

      const denominator = OmniUtil.getCommonDenominatorBetween(common, types[i]);
      if (!denominator || denominator.level <= EqualityLevel.NOT_EQUAL_MIN) {
        return undefined;
      }

      common = denominator?.type;
      lowestEqualityLevel = Math.min(lowestEqualityLevel, denominator?.level);
    }

    if (!common) {
      return undefined;
    }

    return {
      type: common,
      level: lowestEqualityLevel,
    };
  }

  /**
   * Checks for equality or a common denominator between two types. Will return the type and level of equality.
   *
   * @param a First type to compare with
   * @param b Second type to compare to
   * @param create True if a new type should be created and returned, if common denominator can be achieved that way
   */
  public static getCommonDenominatorBetween(a: OmniType, b: OmniType, create?: boolean): CommonDenominatorType<OmniType> | undefined {

    if (a == b) {
      return {type: a, level: EqualityLevel.IDENTITY_MIN};
    }

    if (a.kind == OmniTypeKind.PRIMITIVE && b.kind == OmniTypeKind.PRIMITIVE) {
      return this.getCommonDenominatorBetweenPrimitives(a, b);
    } else if (a.kind == OmniTypeKind.HARDCODED_REFERENCE && b.kind == OmniTypeKind.HARDCODED_REFERENCE) {
      return a.fqn === b.fqn ? {type: a, level: EqualityLevel.CLONE_MIN} : undefined;
    } else if (a.kind == OmniTypeKind.ENUM && b.kind == OmniTypeKind.ENUM) {
      // TODO: This can probably be VERY much improved -- like taking the entries that are similar between the two
      return Naming.unwrap(a.name) == Naming.unwrap(b.name) ? {type: a, level: EqualityLevel.CLONE_MIN} : undefined;
    } else if (a.kind == OmniTypeKind.DICTIONARY && b.kind == OmniTypeKind.DICTIONARY) {
      return this.getCommonDenominatorBetweenDictionaries(a, b, create);
    } else if (a.kind == OmniTypeKind.ARRAY && b.kind == OmniTypeKind.ARRAY) {
      return this.getCommonDenominatorBetweenArrays(a, b, create);
    } else if (a.kind == OmniTypeKind.UNKNOWN && b.kind == OmniTypeKind.UNKNOWN) {
      return {type: a, level: EqualityLevel.CLONE_MIN};
    } else if (a.kind == OmniTypeKind.NULL && b.kind == OmniTypeKind.NULL) {
      return {type: a, level: EqualityLevel.CLONE_MIN};
    } else if (a.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION && b.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      return this.getCommonDenominatorBetweenPropertiesByPosition(a, b, create);
    } else if (a.kind == OmniTypeKind.OBJECT && b.kind == OmniTypeKind.OBJECT) {
      const result = this.getCommonDenominatorBetweenObjects(a, b, create);
      if (result) {
        return result;
      }
    }

    if (a.kind == OmniTypeKind.OBJECT || b.kind == OmniTypeKind.OBJECT) {
      return this.getCommonDenominatorBetweenObjectAndOther(a, b, create);
    } else if (a.kind == OmniTypeKind.COMPOSITION) {
      // TODO: Do something here. There might be parts of 'a' and 'b' that are similar.
      // TODO: Should we then create a new composition type, or just return the first match?
    } else if (a.kind == OmniTypeKind.GENERIC_TARGET) {
      if (b.kind == OmniTypeKind.GENERIC_TARGET) {
        return this.getCommonDenominatorBetweenGenericTargets(a, b, create);
      }
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenGenericTargets(
    a: OmniGenericTargetType,
    b: OmniGenericTargetType,
    create?: boolean,
  ): CommonDenominatorType<OmniGenericTargetType> | undefined {

    if (a.source != b.source) {
      return undefined;
    }

    // TODO: Improve! Right now we might need to move the generic target types into external types.
    //        <T extends generated.omnigen.JsonRpcRequestParams<generated.omnigen.AccountLedgerRequestParamsData>>
    //        <T extends generated.omnigen.JsonRpcRequestParams<generated.omnigen.AccountPayoutParamsData>>
    //        =
    //        <TData extends generated.omnigen.AbstractToTrustlyRequestParamsData, T extends generated.omnigen.JsonRpcRequestParams<TData>>
    //        Then "params" should be of type T
    //        So if they differ, we need to explode the types
    //        Hopefully this will automatically be done recursively per level of inheritance so it's less complex to code!

    const commonTargetIdentifiers: OmniGenericTargetIdentifierType[] = [];

    const matching = OmniUtil.getMatchingTargetIdentifiers(a.targetIdentifiers, b.targetIdentifiers);
    if (!matching) {
      return undefined;
    }

    let lowestEqualityLevel: EqualityLevel = EqualityLevel.CLONE_MIN;
    for (const match of matching) {

      let commonIdentifierType = OmniUtil.getCommonDenominatorBetween(match.a.type, match.b.type, create);
      if (!commonIdentifierType) {

        // The source is the same, the identifiers are the same, but there is no common type between them.
        // But in almost all languages then, we want the generic type to be "?" or "any" or similar.
        // We might want to change this depending on language, but that's a later problem.
        commonIdentifierType = {
          type: {kind: OmniTypeKind.UNKNOWN},
          level: EqualityLevel.ISOMORPHIC_MIN,
        };
      }

      commonTargetIdentifiers.push({
        kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
        type: commonIdentifierType.type,
        sourceIdentifier: match.a.sourceIdentifier,
      });

      lowestEqualityLevel = Math.min(lowestEqualityLevel, commonIdentifierType.level);
    }

    const commonGenericTarget: OmniGenericTargetType = {
      ...a,
      targetIdentifiers: commonTargetIdentifiers,
    };

    return {
      type: commonGenericTarget,
      level: lowestEqualityLevel,
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
    create?: boolean,
  ): CommonDenominatorType<OmniType> | undefined {

    if (b.kind == OmniTypeKind.OBJECT && b.extendedBy) {

      // This will recursively search downwards in B's hierarchy.
      const common = OmniUtil.getCommonDenominatorBetween(a, b.extendedBy, create);
      if (common) {
        return {
          type: common.type,
          level: Math.min(EqualityLevel.ISOMORPHIC_MAX, common.level - 1),
        };
      }
    }

    if (a.kind == OmniTypeKind.OBJECT && a.extendedBy) {
      const common = OmniUtil.getCommonDenominatorBetween(a.extendedBy, b, create);
      if (common) {
        return {
          type: common.type,
          level: Math.min(EqualityLevel.ISOMORPHIC_MAX, common.level - 1),
        };
      }
    }

    if (create == false) {
      return undefined;
    }

    // Is there ever anything better we can do here? Like check if signatures are matching?
    return {
      type: {
        kind: OmniTypeKind.UNKNOWN,
      },
      level: EqualityLevel.ISOMORPHIC_MIN,
    };
  }

  private static getCommonDenominatorBetweenPropertiesByPosition(
    a: OmniArrayPropertiesByPositionType,
    b: OmniArrayPropertiesByPositionType,
    create?: boolean,
  ): CommonDenominatorType<OmniArrayPropertiesByPositionType> | undefined {

    if (a.properties.length === b.properties.length) {
      for (let i = 0; i < a.properties.length; i++) {
        if (a.properties[i].name !== b.properties[i].name) {
          return undefined;
        }

        const commonType = OmniUtil.getCommonDenominatorBetween(a.properties[i].type, b.properties[i].type, create);
        if (!commonType) {
          return undefined;
        }
      }

      // TODO: Return something else here instead, which is actually the common denominators between the two
      return {type: a, level: EqualityLevel.FUNCTION_MIN};
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenArrays(
    a: OmniArrayType,
    b: OmniArrayType,
    create?: boolean,
  ): CommonDenominatorType<OmniArrayType> | undefined {

    const common = OmniUtil.getCommonDenominatorBetween(a.of, b.of, create);
    const commonType = common?.type;
    if (common && common.level >= EqualityLevel.CLONE_MIN) {
      return {type: a, level: common.level};
    }

    if (create == false || !commonType) {
      return undefined;
    }

    const createdType: OmniArrayType = {
      ...b,
      ...a,
      of: commonType,
    };

    return {
      type: createdType,
      level: common.level || EqualityLevel.FUNCTION_MIN,
    };
  }

  private static getCommonDenominatorBetweenPrimitives(
    a: OmniPrimitiveType,
    b: OmniPrimitiveType,
  ): CommonDenominatorType<OmniPrimitiveType> | undefined {

    // NOTE: Must nullable be equal? Or do we return the nullable type (if exists) as the common denominator?
    if (a.nullable == b.nullable) {
      if (a.primitiveKind == b.primitiveKind) {
        return {type: a, level: EqualityLevel.CLONE_MIN};
      }

      const moreEncompassing = this.getCommonDenominatorBetweenDissimilarPrimitives(a, b);
      if (moreEncompassing) {
        return moreEncompassing;
      }

      return this.getCommonDenominatorBetweenDissimilarPrimitives(b, a);
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenDissimilarPrimitives(
    a: OmniPrimitiveType,
    b: OmniPrimitiveType,
  ): CommonDenominatorType<OmniPrimitiveType> | undefined {

    switch (a.primitiveKind) {
      case OmniPrimitiveKind.INTEGER:
      case OmniPrimitiveKind.INTEGER_SMALL:
        switch (b.primitiveKind) {
          case OmniPrimitiveKind.LONG:
          case OmniPrimitiveKind.DOUBLE:
          case OmniPrimitiveKind.FLOAT:
          case OmniPrimitiveKind.DECIMAL:
            return {type: b, level: EqualityLevel.ISOMORPHIC_MIN};
        }
        break;
      case OmniPrimitiveKind.LONG:
        switch (b.primitiveKind) {
          case OmniPrimitiveKind.DOUBLE:
          case OmniPrimitiveKind.FLOAT:
          case OmniPrimitiveKind.DECIMAL:
            return {type: b, level: EqualityLevel.ISOMORPHIC_MIN};
        }
        break;
      case OmniPrimitiveKind.FLOAT:
        switch (b.primitiveKind) {
          case OmniPrimitiveKind.DOUBLE:
          case OmniPrimitiveKind.DECIMAL:
            return {type: b, level: EqualityLevel.ISOMORPHIC_MIN};
        }
        break;
      case OmniPrimitiveKind.DECIMAL:
        switch (b.primitiveKind) {
          case OmniPrimitiveKind.DOUBLE:
            return {type: b, level: EqualityLevel.ISOMORPHIC_MIN};
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
            return {type: a, level: EqualityLevel.SEMANTICS_MIN};
        }
        break;
      case OmniPrimitiveKind.CHAR:
        switch (b.primitiveKind) {
          case OmniPrimitiveKind.STRING:
            return {type: b, level: EqualityLevel.ISOMORPHIC_MIN};
        }
        break;
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenDictionaries(
    a: OmniDictionaryType,
    b: OmniDictionaryType,
    create?: boolean,
  ): CommonDenominatorType<OmniDictionaryType> | undefined {

    const commonKey = OmniUtil.getCommonDenominatorBetween(a.keyType, b.keyType, create);
    if (commonKey) {
      const commonValue = OmniUtil.getCommonDenominatorBetween(a.valueType, b.valueType, create);
      if (commonValue) {
        if (commonKey.type == a.keyType && commonValue.type == a.valueType) {
          return {type: a, level: EqualityLevel.CLONE_MIN};
        }

        if (create == false) {
          return undefined;
        }

        const newDictionary: OmniDictionaryType = {
          kind: OmniTypeKind.DICTIONARY,
          keyType: commonKey.type,
          valueType: commonValue.type,
        };

        return {type: {...b, ...a, ...newDictionary}, level: Math.min(commonKey.level, commonValue.level)};
      }
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenObjects(
    a: OmniObjectType,
    b: OmniObjectType,
    create: boolean | undefined,
  ): CommonDenominatorType<OmniType> | undefined {

    if (a.properties.length != b.properties.length) {
      return undefined;
    }

    if (a.additionalProperties != b.additionalProperties) {
      return undefined;
    }

    let worstPropertyEquality: EqualityLevel | undefined = undefined;
    let worstPropertyTypeEquality: EqualityLevel | undefined = undefined;
    for (let i = 0; i < a.properties.length; i++) {
      // TODO: Move this out from OmniModelMerge and into a method here instead, which we can centrally use
      // TODO: Also move all the common denominator stuff out to a separate class (it's taking too much space here)
      const equality = PropertyUtil.getEqualityLevel(a.properties[i], b.properties[i]);
      if (equality.type) {

        if (worstPropertyEquality == undefined || equality.propertyEquality < worstPropertyEquality) {
          worstPropertyEquality = equality.propertyEquality;
        }

        if (worstPropertyTypeEquality == undefined || equality.typeEquality < worstPropertyTypeEquality) {
          worstPropertyTypeEquality = equality.typeEquality;
        }
      }

      if (worstPropertyEquality !== undefined && worstPropertyEquality < EqualityLevel.CLONE_MIN) {
        return undefined;
      }

      if (worstPropertyTypeEquality !== undefined && worstPropertyTypeEquality < EqualityLevel.FUNCTION_MIN) {
        return undefined;
      }
    }

    if (a.extendedBy || b.extendedBy) {
      if (!a.extendedBy || !b.extendedBy) {
        return undefined;
      }

      const extensionCommon = OmniUtil.getCommonDenominatorBetween(a.extendedBy, b.extendedBy, create);
      if (!extensionCommon) {
        return undefined;
      }
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

    // const bNames = Naming.unwrapAll(b.name);
    if (!aNames.find(aName => bNames.includes(aName))) {

      // The names need to be the same for now.
      // TODO: Should make this an option, to allow differing names if the semantic similarity is high enough.
      return {type: a, level: EqualityLevel.FUNCTION_MIN};
    }

    // TODO: Need to compare the comments and stuff to be able to say CLONES_MIN
    // TODO: Check if it is proper to give back "worstPropertyTypeEquality" -- is this what we want caller to know?
    return {type: a, level: Math.min(worstPropertyTypeEquality ?? EqualityLevel.CLONE_MIN, EqualityLevel.CLONE_MIN)};
  }
}
