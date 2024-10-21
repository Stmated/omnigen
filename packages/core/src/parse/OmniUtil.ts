import {
  Arrayable,
  CommonDenominatorType,
  DebugValue,
  Direction,
  MaybeReadonly,
  Namespace,
  NamespaceArrayItem,
  ObjectEdgeName,
  ObjectName,
  OmniAccessLevel,
  OmniArrayPropertiesByPositionType,
  OmniArrayType,
  OmniCompositionType,
  OmniDecoratingType,
  OmniDictionaryType,
  OmniEnumMember,
  OmniEnumType,
  OmniExclusiveUnionType,
  OmniExternalModelReferenceType,
  OmniGenericTargetIdentifierType,
  OmniGenericTargetType,
  OmniHardcodedReferenceType,
  OmniInput,
  OmniModel,
  OmniNode, OmniNodeKind,
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
  OmniSubTypeCapableType,
  OmniSuperGenericTypeCapableType,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  OmniTypeOf,
  OmniUnknownType,
  SmartUnwrappedType,
  StrictReadonly,
  TargetFeatures,
  TypeDiffKind,
  TypeName,
  TypeOwner,
  TypeUseKind,
  UnknownKind,
  Writeable,
} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {DFSTraverseCallback, OmniTypeVisitor} from './OmniTypeVisitor';
import {Naming} from './Naming';
import {assertUnreachable, CombineMode, CombineOptions, CreateMode} from '../util';
import {PropertyUtil} from './PropertyUtil';
import {ProxyReducerOmni2} from '../reducer2/ProxyReducerOmni2.ts';
import {ANY_KIND} from '../reducer2/types.ts';
import {OmniTypeUtil} from './OmniTypeUtil.ts';
import {OmniDescribeUtils} from './OmniDescribeUtils.ts';

const logger = LoggerFactory.create(import.meta.url);

export interface TypeCollection {

  named: OmniType[];
  all: OmniType[];
  edge: OmniType[];
}

export type TargetIdentifierTuple = { a: OmniGenericTargetIdentifierType, b: OmniGenericTargetIdentifierType };

type CommonDenominatorOptions = { features: TargetFeatures } & CombineOptions;

const EMPTY_ARRAY: ReadonlyArray<any> = Object.freeze([]);

export class OmniUtil {

  /**
   * TODO: Remove in favor of reducer
   */
  public static visitTypesDepthFirst<R>(
    input: TypeOwner | undefined,
    onDown?: DFSTraverseCallback<R>,
    onUp?: DFSTraverseCallback<R>,
    onlyOnce = true,
  ): R | undefined {
    return new OmniTypeVisitor().visitTypesDepthFirst(input, onDown, onUp, onlyOnce);
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
  public static getUnwrappedType<T extends OmniNode | undefined>(type: T): SmartUnwrappedType<T> {

    if (type) {
      if (type.kind === OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
        return OmniUtil.getUnwrappedType(type.of) as SmartUnwrappedType<T>;
      } else if (type.kind === OmniTypeKind.DECORATING) {
        return OmniUtil.getUnwrappedType(type.of) as SmartUnwrappedType<T>;
      }
    }

    return type as SmartUnwrappedType<T>;
  }

  /**
   * Similar to `getUnwrappedType` but it also unwraps it so that we get the type that would be the one that is used as a code unit.
   * For example `GenericTarget` to `GenericSource`
   */
  public static getTopLevelType(type: OmniType): OmniType {

    const unwrapped = OmniUtil.getUnwrappedType(type);
    if (unwrapped.kind === OmniTypeKind.GENERIC_TARGET) {
      return OmniUtil.getTopLevelType(unwrapped.source);
    } else if (unwrapped.kind === OmniTypeKind.GENERIC_SOURCE) {
      return OmniUtil.getTopLevelType(unwrapped.of);
    }

    return unwrapped;
  }

  public static asSubType(type: MaybeReadonly<OmniNode> | undefined): type is OmniSubTypeCapableType {

    if (!type) {
      return false;
    }

    if (type.kind === OmniTypeKind.OBJECT || type.kind === OmniTypeKind.ENUM || type.kind === OmniTypeKind.INTERFACE) {
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

    if (type.kind === OmniTypeKind.OBJECT) {
      return type;
    }

    if (type.kind === OmniTypeKind.INTERFACE) {
      return type;
    }

    if (type.kind === OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {

      const externalGenericSuper = OmniUtil.asGenericSuperType(type.of);
      if (externalGenericSuper) {
        return type as OmniExternalModelReferenceType<OmniSuperGenericTypeCapableType>;
      }
    }

    return undefined;
  }

  public static asSuperType(type: OmniType | undefined, silent = true, special?: (t: OmniType) => boolean | undefined): type is OmniSuperTypeCapableType {
    return OmniTypeUtil.asSuperType(type, silent, special);
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
   */
  public static getPropertiesOf(type: OmniNode): ReadonlyArray<OmniProperty> {

    if (OmniUtil.isPropertyOwner(type)) {
      return type.properties;
    } else if (type.kind === OmniTypeKind.INTERFACE) {
      return OmniUtil.getPropertiesOf(type.of);
    }

    return EMPTY_ARRAY;
  }

  public static isPropertyOwner(type: OmniNode): type is Extract<OmniType, Pick<OmniObjectType, 'properties'>> {
    return type.kind === OmniTypeKind.OBJECT || type.kind === OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION;
  }

  public static getTypesThatInheritFrom(model: OmniModel, type: OmniType): OmniType[] {

    const types: OmniType[] = [];

    ProxyReducerOmni2.builder().reduce(model, {immutable: true}, {
      OBJECT: (n, r) => {
        if (n.extendedBy === type) {
          types.push(OmniUtil.asWriteable(n));
        }
      },
    });

    return types;
  }

  public static getFlattenedSuperTypes(type: OmniSuperTypeCapableType): OmniSuperTypeCapableType[] {

    if (OmniUtil.isComposition(type)) {

      if (type.kind === OmniTypeKind.INTERSECTION) {
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

  public static getFlattenedTypes(type: OmniType): OmniType[] {

    if (OmniUtil.isComposition(type)) {
      return type.types.flatMap(it => {
        return OmniUtil.getFlattenedTypes(it);
      });
    } else {
      return [type];
    }
  }

  public static getSuperTypes(_model: OmniModel, type: OmniSubTypeCapableType | undefined): ReadonlyArray<OmniSuperTypeCapableType> {

    if (type) {
      const unwrapped = OmniUtil.getUnwrappedType(type);
      if (OmniUtil.isComposition(unwrapped)) {
        return EMPTY_ARRAY;
      }

      if (OmniUtil.isComposition(unwrapped.extendedBy)) {
        if (unwrapped.extendedBy.kind === OmniTypeKind.INTERSECTION) {
          return unwrapped.extendedBy.types;
        }
      } else if (unwrapped.extendedBy) {
        return [unwrapped.extendedBy];
      }
    }

    return EMPTY_ARRAY;
  }

  /**
   * Heavy operation, use sparingly
   */
  public static getSubTypeToSuperTypesMap(model: OmniModel): Map<OmniSubTypeCapableType, OmniSuperTypeCapableType[]> {

    const map = new Map<OmniSubTypeCapableType, OmniSuperTypeCapableType[]>();

    const visitor = ProxyReducerOmni2.builder().options({immutable: true}).build({
      [ANY_KIND]: (n, r) => {

        if (!OmniUtil.asSubType(n)) {
          return r.callBase();
        }

        const subType = OmniUtil.getUnwrappedType(n);
        if (!subType) {
          return r.callBase();
        }

        if (OmniUtil.isComposition(subType)) {
          // NOTE: This should likely be removed. A composition can be a subtype and/or supertype depending on target and contents.
          return r.callBase();
        }

        if (subType.extendedBy) {
          const superTypes = OmniUtil.getFlattenedSuperTypes(subType.extendedBy);

          // const actualSubType = ProxyReducer.getTarget(subType);
          const uniqueSuperTypesOfSubType = (map.has(subType) ? map : map.set(subType, [])).get(subType)!;
          for (const superType of superTypes) {
            if (!uniqueSuperTypesOfSubType.includes(superType)) {
              uniqueSuperTypesOfSubType.push(superType);
            }
          }
        }

        return r.callBase();
        // return r.next(n);
      },
    });

    visitor.reduce(model);

    // OmniUtil.visitTypesDepthFirst(model, ctx => {
    //   if (!OmniUtil.asSubType(ctx.type)) {
    //     return;
    //   }
    //
    //   const subType = OmniUtil.getUnwrappedType(ctx.type);
    //   if (!subType) {
    //     return;
    //   }
    //
    //   if (OmniUtil.isComposition(subType)) {
    //     // NOTE: This should likely be removed. A composition can be a subtype and/or supertype depending on target and contents.
    //     return;
    //   }
    //
    //   if (subType.extendedBy) {
    //     const superTypes = OmniUtil.getFlattenedSuperTypes(subType.extendedBy);
    //
    //     const uniqueSuperTypesOfSubType = (map.has(subType) ? map : map.set(subType, [])).get(subType)!;
    //     for (const superType of superTypes) {
    //       if (!uniqueSuperTypesOfSubType.includes(superType)) {
    //         uniqueSuperTypesOfSubType.push(superType);
    //       }
    //     }
    //   }
    // });

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

  public static toLiteralValue(value: unknown): OmniPrimitiveConstantValue {

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

  public static nativeLiteralToPrimitiveKind(value: OmniPrimitiveConstantValue): OmniPrimitiveKinds {
    if (typeof value === 'string') {
      return OmniTypeKind.STRING;
    } else if (typeof value === 'number') {
      return OmniTypeKind.NUMBER;
    } else if (typeof value === 'boolean') {
      return OmniTypeKind.BOOL;
    } else if (value === null) {
      return OmniTypeKind.NULL;
    } else if (typeof value === 'object') {
      throw new Error(`Need to implement what should happen if given an object literal: ${JSON.stringify(value)}`);
    }

    assertUnreachable(value);
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

  public static hasMeta(type: OmniType): boolean {

    if (('name' satisfies keyof OmniObjectType) in type) {
      return !!type.name;
    }
    if (('description' satisfies keyof OmniObjectType) in type) {
      return !!type.description;
    }
    if (('summary' satisfies keyof OmniObjectType) in type) {
      return !!type.summary;
    }
    if (('title' satisfies keyof OmniObjectType) in type) {
      return !!type.title;
    }

    return false;
  }

  public static isNull(type: StrictReadonly<OmniType>) {
    return type.kind === OmniTypeKind.NULL;
  }

  public static isUndefined(type: StrictReadonly<OmniType>) {
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
    return OmniDescribeUtils.getVirtualPrimitiveKindName(kind, nullable);
  }

  /**
   * Gives the name of the type, or a description which describes the type.
   * Should only ever be used for logging or comments or other non-essential things.
   *
   * @param type
   */
  public static describe(type: StrictReadonly<OmniType> | undefined): string {
    return OmniDescribeUtils.describe(type);
  }

  /**
   * Gets the name of the type, or returns 'undefined' if the type is not named.
   *
   * @param type The type to try and find a name for
   */
  public static getTypeName(type: StrictReadonly<OmniType>): TypeName | undefined {
    return OmniDescribeUtils.getTypeName(type);
  }

  public static isNullableType(type: OmniType | StrictReadonly<OmniType>, features?: TargetFeatures): type is ((OmniPrimitiveType & { nullable: true }) | OmniPrimitiveNull) {
    return OmniTypeUtil.isNullableType(type, features);
  }

  public static hasSpecifiedConstantValue(type: OmniType): type is OmniPrimitiveType & { literal: true } {

    if (OmniUtil.isPrimitive(type)) {
      if (type.literal === true) {
        return true;
      }
    }

    return false;
  }

  public static getSpecifiedConstantValue(type: OmniType): OmniPrimitiveConstantValue | undefined {
    if (OmniUtil.isPrimitive(type)) {
      if (type.literal === true) {
        return type.value;
      }
    }

    return undefined;
  }

  public static getSpecifiedValue(type: OmniType): [OmniPrimitiveConstantValue, 'constant' | 'default'] | undefined {
    if (OmniUtil.isPrimitive(type) && type.value !== undefined) {
      return [type.value, type.literal ? 'constant' : 'default'];
    }

    return undefined;
  }

  /**
   * IMPORTANT to remember that this is NOT an actual type name, it is a VIRTUAL type name for identification.
   *
   * NOT to be relied upon or used for naming output classes or types.
   */
  public static getVirtualTypeName(type: StrictReadonly<OmniType>, depth?: number): TypeName {
    return OmniDescribeUtils.getVirtualTypeName(type, depth);
  }

  public static toReferenceType<T extends OmniType>(type: T): T;
  public static toReferenceType<T extends OmniType>(type: T, create: CreateMode | undefined): T | undefined;
  public static toReferenceType<T extends OmniType>(type: T, create?: CreateMode | undefined): T | undefined {

    if (type.kind === OmniTypeKind.DECORATING) {

      const ofAsRef = OmniUtil.toReferenceType(type.of);
      if (ofAsRef === type.of) {
        return type;
      }

      if (!OmniUtil.canCreate(create, CreateMode.SIMPLE)) {
        return undefined;
      }

      return ({
        ...type,
        of: ofAsRef,
      } satisfies OmniDecoratingType) as T;
    }

    // NOTE: If changed, make sure OmniUtil#isNullable is updated
    if (OmniUtil.isPrimitive(type)) {

      if (type.kind === OmniTypeKind.NULL || type.kind === OmniTypeKind.VOID) {

        // NOTE: The string part is NOT always true, this should be moved to code for the specific language
        return type;
      }

      if (type.nullable) {
        return type;
      }

      if (!OmniUtil.canCreate(create, CreateMode.SIMPLE)) {
        return undefined;
      }

      return {
        ...type,
        nullable: true,
      } satisfies OmniPrimitiveType;
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
   *
   * @deprecated Do not use this function, instead use the Reducer pattern. Migrate all solutions that rely on inline changes to the reducer.
   */
  public static swapType<T extends OmniType, R extends OmniType>(
    parent: TypeOwner,
    from: T,
    to: R | null,
    maxDepth = 10,
  ): R | undefined | null {

    if (parent == from) {
      return to;
    }

    if (maxDepth == 0) {
      return undefined;
    }

    if ('endpoints' in parent) {
      this.swapTypeInsideModel(parent, from, to, maxDepth);
    } else if ('type' in parent && parent.kind !== OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
      this.swapTypeInsideTypeOwner(parent, from, to, maxDepth);
    } else {
      this.swapTypeInsideType(parent, from, to, maxDepth);
    }

    return undefined;
  }

  /**
   * TODO: Replace with a tree-folding traverser/visitor instead
   * @deprecated Instead use `ProxyReducerOmni2` (it needs to be fixed first, but prematurely deprecating so that there are lots of warnings to remind me to work on it)
   */
  private static swapTypeInsideType<T extends OmniType, R extends OmniType>(
    parent: OmniType,
    from: T,
    to: R | null,
    maxDepth: number,
  ): void {

    switch (parent.kind) {
      case OmniTypeKind.UNION:
      case OmniTypeKind.EXCLUSIVE_UNION:
      case OmniTypeKind.INTERSECTION:
      case OmniTypeKind.NEGATION: {
        for (let i = 0; i < parent.types.length; i++) {
          const found = OmniUtil.swapType(parent.types[i], from, to, maxDepth - 1);
          if (found === null) {
            parent.types.splice(i, 1);
          } else if (found) {
            if (to) {
              parent.types.splice(i, 1, to);
            } else {
              parent.types.splice(i, 1);
            }
          }
        }
        break;
      }
      case OmniTypeKind.OBJECT: {
        if (parent.extendedBy) {
          // We do not decrease the max depth if it's a composition, since it is an invisible wrapper
          const decrementDepthBy = (OmniUtil.isComposition(parent.extendedBy)) ? 0 : 1;
          const found = OmniUtil.swapType(parent.extendedBy, from, to, maxDepth - decrementDepthBy);
          if (found === null) {
            parent.extendedBy = undefined;
          } else if (found) {
            if (OmniUtil.asSuperType(found)) {
              parent.extendedBy = found;
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
          if (found === null) {
            throw new Error(`Cannot remove the type of the property. Perhaps this should simply remove the property?`);
          } else if (found) {
            property.type = found;
          }
        }
        break;
      }
      case OmniTypeKind.INTERFACE: {
        const found = OmniUtil.swapType(parent.of, from, to, maxDepth - 1);
        if (found === null) {
          throw new Error(`Cannot remove 'of' from the interface. Perhaps the interface should simply be removed?`);
          // parent.of = undefined;
        } else if (found) {
          if (OmniUtil.asSuperType(found)) {
            parent.of = found;
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
          if (found === null) {
            parent.targetIdentifiers.splice(i, 1);
            i--;
          } else if (found) {
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
        // if (from === parent.sourceIdentifier) {
        //   throw new Error(`If the source is removed, then we should remove the target identifier too?`);
        // }

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
          if (found === null) {
            parent.sourceIdentifiers.splice(i, 1);
            i--;
          } else if (found) {
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
          if (found === null) {
            parent.lowerBound = undefined;
          } else if (found) {
            parent.lowerBound = found;
          }
        }
        if (parent.upperBound) {
          const found = OmniUtil.swapType(parent.upperBound, from, to, maxDepth - 1);
          if (found === null) {
            parent.upperBound = undefined;
          } else if (found) {
            parent.upperBound = found;
          }
        }
        if (parent.knownEdgeTypes) {
          for (let i = 0; i < parent.knownEdgeTypes.length; i++) {
            const edge = parent.knownEdgeTypes[i];
            const found = OmniUtil.swapType(edge, from, to, maxDepth);
            if (found === null) {
              parent.knownEdgeTypes.splice(i, 1);
              i--;
            } else if (found) {
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
          if (found === null) {
            parent.types.splice(i, 1);
          } else if (found) {
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
    to: R | null,
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
    to: R | null,
    maxDepth: number,
  ): void {

    parent.types.forEach(t => {

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
          const swappedType = OmniUtil.swapType(p.type, from, to, maxDepth);
          if (swappedType) {
            p.type = swappedType;
          }
        });
        (m.target.propertyPath || []).forEach(p => {
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
      return diffs.some(it => it == TypeDiffKind.FUNDAMENTAL_TYPE || it == TypeDiffKind.POLYMORPHIC_LITERAL);
    }

    return false;
  }

  public static getDiffAmount(diffs?: TypeDiffKind[]): number {

    let highest = 0;
    if (diffs) {
      for (const diff of diffs) {
        const amount = OmniUtil.getDiffAmountSingle(diff);
        if (amount >= 10) {
          return amount;
        }
        if (amount > highest) {
          highest = amount;
        }
      }
    }

    return highest;
  }

  private static getDiffAmountSingle(diff: TypeDiffKind): number {

    if (diff === TypeDiffKind.FUNDAMENTAL_TYPE) {
      return 10;
    } else if (diff === TypeDiffKind.ISOMORPHIC_TYPE) {
      return 9;
    } else if (diff === TypeDiffKind.POLYMORPHIC_LITERAL) {
      return 8;
    } else if (diff === TypeDiffKind.IS_SUPERTYPE) {
      return 7;
    } else if (diff === TypeDiffKind.NO_GENERIC_OVERLAP) {
      return 7;
    } else if (diff === TypeDiffKind.CONCRETE_VS_ABSTRACT) {
      return 6;
    } else if (diff === TypeDiffKind.MISSING_MEMBERS) {
      return 6;
    } else if (diff === TypeDiffKind.NOMINAL) {
      return 6;
    } else if (diff === TypeDiffKind.SIZE) {
      return 5;
    } else if (diff === TypeDiffKind.PRECISION) {
      return 4;
    }

    return 0;
  }

  /**
   * This function should not be necessary, but we have it for now until all models are readonly and `StrictReadOnly` can be stripped out.
   */
  public static asWriteable<T>(value: T): Writeable<T> {
    return value as Writeable<T>;
  }

  public static getCommonDenominator(options: TargetFeatures | CommonDenominatorOptions, types: ReadonlyArray<StrictReadonly<OmniType>>): CommonDenominatorType | undefined {

    if (types.length === 1) {
      return {
        type: OmniUtil.asWriteable(types[0]),
      };
    }

    const opt: CommonDenominatorOptions = ('features' in options) ? options : {features: options, create: undefined};

    let commonDiffAmount = 0;
    let common: CommonDenominatorType = {
      type: OmniUtil.asWriteable(types[0]),
    };

    for (let i = 1; i < types.length; i++) {

      const denominator = OmniUtil.getCommonDenominatorBetween(common.type, types[i], opt.features, opt);
      if (!denominator) {
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

  public static isNameable(type: StrictReadonly<OmniType>) {

    return type.kind === OmniTypeKind.OBJECT
      || type.kind === OmniTypeKind.INTERFACE
      || type.kind === OmniTypeKind.ENUM
      || type.kind === OmniTypeKind.ARRAY
      || type.kind === OmniTypeKind.DECORATING
      || OmniUtil.isPrimitive(type);
  }

  /**
   * Checks for equality or a common denominator between two types. Will return the type and level of equality.
   *
   * This (and the related) functions should always return the COMMON DENOMINATOR, ie. what both can fulfill.
   * It must not return a type that simply satisfies both (such as creating a union).
   *
   * @param a - First type to compare with
   * @param b - Second type to compare to
   * @param features - Description of the features that the caller supports
   * @param opt - What level of things are allowed to be created to fulfill a non-undefined result, and how to solve the resolution of the two types.
   */
  public static getCommonDenominatorBetween(
    a: StrictReadonly<OmniType>,
    b: StrictReadonly<OmniType>,
    features: TargetFeatures,
    opt?: CombineOptions,
  ): CommonDenominatorType | undefined {

    if (a == b) {
      return {type: OmniUtil.asWriteable(a)};
    }

    if ((a.kind == OmniTypeKind.NULL || a.kind == OmniTypeKind.VOID) && b.kind == a.kind) {
      return {type: a};
    }

    if (OmniUtil.isPrimitive(a) && OmniUtil.isPrimitive(b)) {
      return OmniUtil.getCommonDenominatorBetweenPrimitives(a, b, features, opt);
    } else if (a.kind == OmniTypeKind.HARDCODED_REFERENCE && b.kind == OmniTypeKind.HARDCODED_REFERENCE) {
      return OmniUtil.getCommonDenominatorBetweenHardcodedReferences(a, b, opt);
    } else if (a.kind == OmniTypeKind.ENUM && b.kind == OmniTypeKind.ENUM) {
      return OmniUtil.getCommonDenominatorBetweenEnums(a, b, opt);
    } else if (a.kind == OmniTypeKind.DICTIONARY && b.kind == OmniTypeKind.DICTIONARY) {
      return OmniUtil.getCommonDenominatorBetweenDictionaries(a, b, features, opt);
    } else if (a.kind == OmniTypeKind.ARRAY && b.kind == OmniTypeKind.ARRAY) {
      return OmniUtil.getCommonDenominatorBetweenArrays(a, b, features, opt);
    } else if (a.kind == OmniTypeKind.UNKNOWN && b.kind == OmniTypeKind.UNKNOWN) {
      return this.getCommonDenominatorBetweenUnknowns(a, b, opt);
    } else if (a.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION && b.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      return OmniUtil.getCommonDenominatorBetweenPropertiesByPosition(a, b, features, opt);
    } else if (a.kind == OmniTypeKind.OBJECT && b.kind == OmniTypeKind.OBJECT) {
      const result = OmniUtil.getCommonDenominatorBetweenObjects(a, b, features, opt);
      if (result) {
        return result;
      }
    }

    if (a.kind == OmniTypeKind.OBJECT || b.kind == OmniTypeKind.OBJECT) {
      return this.getCommonDenominatorBetweenObjectAndOther(a, b, features, opt);
    } else if (a.kind == OmniTypeKind.GENERIC_TARGET) {
      if (b.kind == OmniTypeKind.GENERIC_TARGET) {
        return OmniUtil.getCommonDenominatorBetweenGenericTargets(a, b, features, opt);
      }
    } else if ((a.kind == OmniTypeKind.ENUM || OmniUtil.isPrimitive(a)) && (b.kind == OmniTypeKind.ENUM || OmniUtil.isPrimitive(b))) {

      const enumOption = (a.kind == OmniTypeKind.ENUM) ? a : (b.kind == OmniTypeKind.ENUM) ? b : undefined;
      const primitiveOption = (OmniUtil.isPrimitive(a)) ? a : (OmniUtil.isPrimitive(b)) ? b : undefined;

      if (enumOption && primitiveOption) {
        return OmniUtil.getCommonDenominatorBetweenEnumAndPrimitive(enumOption, primitiveOption, opt);
      }
    } else if (a.kind === OmniTypeKind.EXCLUSIVE_UNION && !OmniUtil.isComposition(b)) {

      return this.getCommonDenominatorBetweenExclusiveUnionAndOther(a, b, features);

      // TODO: Do something here. There might be parts of 'a' and 'b' that are similar.
      // TODO: Should we then create a new composition type, or just return the first match?
    }

    // TODO: Need to support more mixes of compositions

    return undefined;
  }

  private static getCommonDenominatorBetweenExclusiveUnionAndOther(
    a: StrictReadonly<OmniExclusiveUnionType>,
    b: StrictReadonly<OmniType>,
    features: TargetFeatures,
  ): CommonDenominatorType | undefined {

    let common = OmniUtil.getCommonDenominatorBetween(a.types[0], b, features);
    for (let i = 1; i < a.types.length && common; i++) {
      common = OmniUtil.getCommonDenominatorBetween(common.type, a.types[i], features);
    }

    return common;
  }

  private static getCommonDenominatorBetweenUnknowns(
    a: OmniUnknownType,
    b: OmniUnknownType,
    opt?: CombineOptions,
  ): CommonDenominatorType | undefined {

    if (a.unknownKind === b.unknownKind) {
      return {type: a};
    }

    if (a.unknownKind === UnknownKind.WILDCARD) {
      return {type: a};
    }
    if (b.unknownKind === UnknownKind.WILDCARD) {
      return {type: b};
    }

    if (a.unknownKind === UnknownKind.ANY) {
      return {type: a};
    }
    if (b.unknownKind === UnknownKind.ANY) {
      return {type: b};
    }

    if (a.unknownKind === UnknownKind.DYNAMIC) {
      return {type: a};
    }
    if (b.unknownKind === UnknownKind.DYNAMIC) {
      return {type: b};
    }

    if (a.unknownKind === UnknownKind.DYNAMIC_NATIVE) {
      return {type: a};
    }
    if (b.unknownKind === UnknownKind.DYNAMIC_NATIVE) {
      return {type: b};
    }

    if (a.unknownKind === UnknownKind.DYNAMIC_OBJECT && b.unknownKind == UnknownKind.OBJECT) {
      return {type: a};
    }
    if (b.unknownKind === UnknownKind.DYNAMIC_OBJECT && a.unknownKind == UnknownKind.OBJECT) {
      return {type: b};
    }

    if (OmniUtil.canCreate(opt?.create, CreateMode.SIMPLE)) {
      return {type: {kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.ANY}, diffs: [TypeDiffKind.ISOMORPHIC_TYPE], created: true};
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenEnumAndPrimitive(
    a: StrictReadonly<OmniEnumType>,
    b: StrictReadonly<OmniPrimitiveType>,
    opt?: CombineOptions,
  ): CommonDenominatorType | undefined {

    if (b.literal) {
      return undefined;
    }

    if (a.itemKind === b.kind) {
      return {type: b, diffs: [TypeDiffKind.NOMINAL]};
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenGenericTargets(
    a: StrictReadonly<OmniGenericTargetType>,
    b: StrictReadonly<OmniGenericTargetType>,
    targetFeatures: TargetFeatures,
    opt?: CombineOptions,
  ): CommonDenominatorType<OmniGenericTargetType> | undefined {

    if (a.source != b.source) {
      return undefined;
    }

    const commonTargetIdentifiers: OmniGenericTargetIdentifierType[] = [];

    const matching = OmniUtil.getMatchingTargetIdentifiers(a.targetIdentifiers, b.targetIdentifiers);
    if (matching.length != a.targetIdentifiers.length) {
      return undefined;
    }

    // TODO: Should check "create" if we are allowed to create new types like this -- and only create a new one if all generic arguments are not the same
    if (opt?.create === CreateMode.NONE) {
      return undefined;
    }

    const uniqueTargetIdentifierDiffs = new Set<TypeDiffKind>();
    for (const match of matching) {

      let commonIdentifierType = OmniUtil.getCommonDenominatorBetween(match.a.type, match.b.type, targetFeatures, opt);
      if (!commonIdentifierType) {

        // The source is the same, the identifiers are the same, but there is no common type between them.
        // But in almost all languages then, we want the generic type to be "?" or "any" or similar.
        // We might want to change this depending on language, but that's a later problem.
        commonIdentifierType = {
          type: {kind: OmniTypeKind.UNKNOWN},
          diffs: [TypeDiffKind.FUNDAMENTAL_TYPE],
        };
      }

      commonTargetIdentifiers.push({
        kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
        type: commonIdentifierType.type,
        sourceIdentifier: match.a.sourceIdentifier,
      });

      for (const diff of (commonIdentifierType.diffs ?? [])) {
        uniqueTargetIdentifierDiffs.add(diff);
      }
    }

    const commonGenericTarget: OmniGenericTargetType = {
      ...a,
      targetIdentifiers: commonTargetIdentifiers,
    };

    if (uniqueTargetIdentifierDiffs.size > 0) {

      // We do this to tell any caller that the difference is with the generic arguments.
      // NOTE: A much better way would be if there was a way to represent "these are the diffs for the main type, and here is an array of diffs for the different generic arguments"
      //        But that does not exist (yet), because it would increase complexity a lot when checking for diffs.
      uniqueTargetIdentifierDiffs.delete(TypeDiffKind.FUNDAMENTAL_TYPE);
      uniqueTargetIdentifierDiffs.add(TypeDiffKind.NO_GENERIC_OVERLAP);
    }

    return {
      type: commonGenericTarget,
      diffs: [...uniqueTargetIdentifierDiffs],
    };
  }

  public static getMatchingTargetIdentifiers(
    a: ReadonlyArray<OmniGenericTargetIdentifierType>,
    b: ReadonlyArray<OmniGenericTargetIdentifierType>,
  ): Array<TargetIdentifierTuple> {

    const result: Array<TargetIdentifierTuple> = [];
    for (const aIdentifier of a) {
      for (const bIdentifier of b) {
        if (aIdentifier.sourceIdentifier === bIdentifier.sourceIdentifier) {
          result.push({
            a: aIdentifier,
            b: bIdentifier,
          });
          break;
        }
      }
    }

    return result;
  }

  private static getCommonDenominatorBetweenObjectAndOther(
    a: StrictReadonly<OmniType>,
    b: StrictReadonly<OmniType>,
    targetFeatures: TargetFeatures,
    opt?: CombineOptions,
  ): CommonDenominatorType | undefined {

    if (b.kind == OmniTypeKind.OBJECT && b.extendedBy) {

      // This will recursively search downwards in B's hierarchy.
      const common = OmniUtil.getCommonDenominatorBetween(a, b.extendedBy, targetFeatures, opt);
      if (common) {
        const diffs = [...(common.diffs ?? [])];
        if (!diffs.includes(TypeDiffKind.IS_SUPERTYPE)) {
          diffs.push(TypeDiffKind.IS_SUPERTYPE);
        }
        return {type: common.type, diffs: diffs};
      }
    }

    if (a.kind == OmniTypeKind.OBJECT && a.extendedBy) {
      const common = OmniUtil.getCommonDenominatorBetween(a.extendedBy, b, targetFeatures, opt);
      if (common) {
        return {type: common.type, diffs: [...(common.diffs ?? []), TypeDiffKind.IS_SUPERTYPE]};
      }
    }

    if (!OmniUtil.canCreate(opt?.create, CreateMode.SIMPLE)) {
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
    a: StrictReadonly<OmniArrayPropertiesByPositionType>,
    b: StrictReadonly<OmniArrayPropertiesByPositionType>,
    targetFeatures: TargetFeatures,
    opt?: CombineOptions,
  ): CommonDenominatorType<OmniArrayPropertiesByPositionType> | undefined {

    if (a.properties.length === b.properties.length) {

      const diffs: TypeDiffKind[] = [];
      for (let i = 0; i < a.properties.length; i++) {
        if (a.properties[i].name !== b.properties[i].name) {
          return undefined;
        }

        const common = OmniUtil.getCommonDenominatorBetween(a.properties[i].type, b.properties[i].type, targetFeatures, opt);
        if (!common || OmniUtil.isDisqualifyingDiffForCommonType(common.diffs)) {
          return undefined;
        }

        if (common.diffs) {
          diffs.push(...common.diffs);
        }
      }

      // TODO: Return something else here instead, which is actually the common denominators between the two
      return {
        type: OmniUtil.asWriteable(a),
        diffs: diffs,
      };
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenArrays(
    a: OmniArrayType,
    b: OmniArrayType,
    targetFeatures: TargetFeatures,
    opt?: CombineOptions,
  ): CommonDenominatorType<OmniArrayType> | undefined {

    const common = OmniUtil.getCommonDenominatorBetween(a.of, b.of, targetFeatures, opt);
    if (common && !common?.diffs?.length) {
      return {type: a};
    }

    // NOTE: There might be some differences we can ignore; should check for them
    if (!OmniUtil.canCreate(opt?.create, CreateMode.ANY) || !common) {
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
    opt?: CombineOptions,
  ): CommonDenominatorType<OmniPrimitiveType> | undefined {

    if (a.kind == b.kind && a.nullable == b.nullable && a.value == b.value && a.literal == b.literal) {
      return {type: a};
    }

    const common = this.getCommonDenominatorBetweenPrimitiveKinds(a, b, opt) || this.getCommonDenominatorBetweenPrimitiveKinds(b, a, opt);
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

    if (overridingNullability && common.type) {
      const nullableType = OmniUtil.toReferenceType(common.type);
      if (OmniUtil.isPrimitive(nullableType)) {
        // TODO: Need to be able to send along `lossless` and `aggregate` throughout the run
        OmniUtil.mergeTypeMeta(a, nullableType, false, true);
        common.type = nullableType;
        common.diffs = [...(common.diffs ?? []), TypeDiffKind.NULLABILITY];
      } else {
        throw new Error(`Reference type '${OmniUtil.describe(nullableType)}' given back was not a primitive type`);
      }
    }

    if (a.value !== b.value) {
      return OmniUtil.getCommonDenominatorBetweenPrimitivesWithDifferentLiteralValues(
        a, b, common, targetFeatures, opt,
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
    opt?: CombineOptions,
  ): CommonDenominatorType<OmniPrimitiveType> | undefined {

    // Then check if one of them is literal, but if the literal is the common type, then they are not covariant.
    // const newTypeDifference = (targetFeatures.literalTypes) ? TypeDiffKind.POLYMORPHIC_LITERAL : TypeDiffKind.FUNDAMENTAL_TYPE;

    if (a.literal && b.literal) {
      return {type: OmniUtil.getGeneralizedType(common.type ?? a, opt?.create), diffs: [...(common.diffs ?? []), TypeDiffKind.POLYMORPHIC_LITERAL]};
    } else if (a.literal && !b.literal && common.type == a) {
      return {type: b, diffs: [...(common.diffs ?? []), TypeDiffKind.CONCRETE_VS_ABSTRACT]};
    } else if (!a.literal && b.literal && common.type == b) {
      return {type: a, diffs: [...(common.diffs ?? []), TypeDiffKind.CONCRETE_VS_ABSTRACT]};
    }

    // One is literal and the other not, then diff is Concrete vs Abstract -- otherwise it is a Polymorphic Literal.
    const diff = (a.literal !== b.literal) ? TypeDiffKind.CONCRETE_VS_ABSTRACT : TypeDiffKind.POLYMORPHIC_LITERAL;
    return {type: OmniUtil.getGeneralizedType(common.type ?? a, opt?.create), diffs: [...(common.diffs ?? []), diff]};
  }

  private static getCommonDenominatorBetweenPrimitiveKinds(
    a: OmniPrimitiveType,
    b: OmniPrimitiveType,
    opt?: CombineOptions,
  ): CommonDenominatorType<OmniPrimitiveType | undefined> | undefined {

    if (a.kind === b.kind) {
      // The type being undefined means that we have no preference over a or b
      return {type: undefined};
    }

    if (a.kind === OmniTypeKind.NULL) {
      if (b.nullable) {
        return {type: b};
      } else {
        const created = OmniUtil.toReferenceType(b, opt?.create);
        if (!created) {
          return undefined;
        }
        return {type: created};
      }
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
    opt?: CombineOptions,
  ): CommonDenominatorType<OmniDictionaryType> | undefined {

    const commonKey = OmniUtil.getCommonDenominatorBetween(a.keyType, b.keyType, targetFeatures, opt);
    if (commonKey) {
      const commonValue = OmniUtil.getCommonDenominatorBetween(a.valueType, b.valueType, targetFeatures, opt);
      if (commonValue) {
        if (commonKey.type == a.keyType && commonValue.type == a.valueType) {
          return {
            type: a,
            diffs: [...(commonKey.diffs ?? []), ...(commonValue.diffs ?? [])],
          };
        }

        if (!OmniUtil.canCreate(opt?.create, CreateMode.ANY)) {
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
    types: ReadonlyArray<StrictReadonly<OmniType>>,
    targetFeatures: TargetFeatures,
    allowedDiffPredicate: (diff: TypeDiffKind) => boolean = (() => false),
  ) {

    const distinctTypes: Array<OmniType> = [];
    for (const type of types) {

      const sameType = distinctTypes.find(it => {
        const common = OmniUtil.getCommonDenominatorBetween(type, it, targetFeatures, {create: CreateMode.NONE});
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
        distinctTypes.push(OmniUtil.asWriteable(type));
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

  public static getGeneralizedType<T extends OmniType>(type: T, create?: CreateMode): T {

    if (OmniUtil.isPrimitive(type) && type.value !== undefined && OmniUtil.canCreate(create, CreateMode.SIMPLE)) {

      const generalizedPrimitive: typeof type = {
        ...type,
      };
      delete generalizedPrimitive.value;
      delete generalizedPrimitive.literal;

      return generalizedPrimitive;
    }

    return type;
  }

  private static canCreate(create: CreateMode | undefined, match: CreateMode): boolean {

    if (create === undefined) {
      return match === CreateMode.SIMPLE;
    } else if (create === CreateMode.SIMPLE) {
      return (match === CreateMode.SIMPLE);
    } else {
      return (create === CreateMode.ANY);
    }
  }

  public static isDiffMatch(diffs: TypeDiffKind, matches: ReadonlyArray<TypeDiffKind>): boolean {

    for (const needle of matches) {
      if (diffs === needle) {
        return true;
      }

      if (needle == TypeDiffKind.POLYMORPHIC_LITERAL) {
        if (diffs === TypeDiffKind.FUNDAMENTAL_TYPE || diffs === TypeDiffKind.ISOMORPHIC_TYPE) {
          return true;
        }
      }
    }

    return false;
  }

  private static getCommonDenominatorBetweenObjects(
    a: StrictReadonly<OmniObjectType>,
    b: StrictReadonly<OmniObjectType>,
    features: TargetFeatures,
    opt?: CombineOptions,
  ): CommonDenominatorType | undefined {

    // TODO: We should check the CombineOptions if we can create and this is supposed to be a union or intersection.
    return undefined;

    // if (a.properties.length != b.properties.length) {
    //   return undefined;
    // }
    //
    // if (a.extendedBy !== b.extendedBy) {
    //   return undefined;
    // }
    //
    // // TODO: This needs improvement, since the names should not be resolved here already. Could lead to weird results.
    // const aNames = new Set<string>();
    // Naming.unwrapWithCallback(a.name, name => {
    //   aNames.add(name);
    //   return undefined;
    // });
    //
    // const found = Naming.unwrapWithCallback(b.name, name => {
    //   if (aNames.has(name)) {
    //     return 'found';
    //   }
    //   return undefined;
    // });
    //
    // if (!found) {
    //   return undefined;
    // } else {
    //   logger.debug(`Found two objects with same name: ${found}`);
    // }
    //
    // // I am no longer sure what the point of this comparison is.
    // const diffs: TypeDiffKind[] = [];
    // for (let i = 0; i < a.properties.length; i++) {
    //   // TODO: Move all the common denominator stuff out to a separate class (it's taking too much space here)
    //   const equality = PropertyUtil.getPropertyEquality(a.properties[i], b.properties[i], features);
    //
    //   if (OmniUtil.isDiffMatch(equality.typeDiffs, TypeDiffKind.POLYMORPHIC_LITERAL)) {
    //     return undefined;
    //   }
    //
    //   if (PropertyUtil.isDiffMatch(equality.propertyDiffs, PropertyDifference.NAME, PropertyDifference.TYPE)) {
    //     return undefined;
    //   }
    //
    //   diffs.push(...(equality.typeDiffs ?? []));
    // }
    //
    // return {
    //   type: a,
    //   diffs: diffs,
    // };
  }

  private static getCommonDenominatorBetweenHardcodedReferences(
    a: OmniHardcodedReferenceType,
    b: OmniHardcodedReferenceType,
    opt?: CombineOptions,
  ): CommonDenominatorType | undefined {
    return OmniUtil.isEqualObjectName(a.fqn, b.fqn) ? {type: a} : undefined;
  }

  public static isEqualObjectName(a: ObjectName | undefined, b: ObjectName | undefined): boolean {

    if (!OmniUtil.isEqualNamespace(a?.namespace, b?.namespace)) {
      return false;
    }

    return a?.edgeName === b?.edgeName;
  }

  public static isEqualNamespace(a: Namespace | undefined, b: Namespace | undefined): boolean {

    if (a === b) {
      return true;
    }

    if ((a && !b) || (!a && b)) {
      return false;
    }

    if (a && b) {

      if (a.length !== b.length) {
        return false;
      }

      for (let i = 0; i < a.length; i++) {
        if (OmniUtil.resolveNamespacePart(a[i]) !== OmniUtil.resolveNamespacePart(b[i])) {
          return false;
        }
      }
    }

    return true;
  }

  public static startsWithNamespace(ns: ObjectName | Namespace | undefined, comparedTo: ObjectName | Namespace | undefined): boolean {

    if (ns && 'edgeName' in ns) {
      ns = ns.namespace;
    }

    if (comparedTo && 'edgeName' in comparedTo) {
      comparedTo = comparedTo.namespace;
    }

    if (ns === comparedTo) {
      return true;
    }

    if ((comparedTo?.length ?? 0) < (ns?.length ?? 0)) {
      return false;
    }

    if (comparedTo) {

      if (!ns) {
        return false;
      }

      for (let i = 0; i < comparedTo.length; i++) {
        if (OmniUtil.resolveNamespacePart(ns[i]) !== OmniUtil.resolveNamespacePart(comparedTo[i])) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  public static resolveNamespacePart(item: NamespaceArrayItem): string {
    return OmniDescribeUtils.resolveNamespacePart(item);
  }

  public static resolveObjectEdgeName(name: ObjectEdgeName, use: TypeUseKind | undefined): string {

    if (typeof name === 'string') {
      return name;
    }

    return (use === TypeUseKind.IMPORT) ? name.onImport : name.onUse;
  }

  private static getCommonDenominatorBetweenEnums(
    a: StrictReadonly<OmniEnumType>,
    b: StrictReadonly<OmniEnumType>,
    opt?: CombineOptions,
  ): CommonDenominatorType | undefined {

    // These are in relation to `a` as baseline.
    const extra: OmniEnumMember[] = [];
    const missing: OmniEnumMember[] = [];
    const common: OmniEnumMember[] = [];

    for (const member of a.members) {
      const found = b.members.find(it => it.value === member.value);
      if (!found) {
        missing.push(member);
      } else {
        common.push(member);
      }
    }

    for (const member of b.members) {
      const found = a.members.find(it => it.value === member.value);
      if (!found) {
        extra.push(member);
      }
    }

    if (extra.length == 0 && missing.length == 0) {
      return {type: OmniUtil.asWriteable(a)};
    }


    if (extra.length > 0 && opt?.combine !== CombineMode.UNION) {
      return undefined;
    }

    if (OmniUtil.canCreate(opt?.create, CreateMode.ANY)) {

      let newEnumName = Naming.getCommonName([a.name, b.name]);
      if (!newEnumName) {
        if (opt?.combine === CombineMode.UNION) {
          newEnumName = {prefix: a.name, name: {prefix: 'And', name: b.name}};
        } else {
          // This name is bad. Hopefully if the enums are to be an intersection, they have a common name part.
          newEnumName = {prefix: a.name, name: {prefix: 'AndCommonOf', name: b.name}};
        }
      }

      const unwrappedNew = Naming.unwrap(newEnumName);

      const newMembers: OmniEnumMember[] = (opt?.combine === CombineMode.UNION)
        ? [...a.members, ...extra]
        : [...common];

      for (let i = 0; i < newMembers.length; i++) {

        // const original: OmniEnumMember = newMembers[i];
        const copy: OmniEnumMember = {...newMembers[i]};
        newMembers[i] = copy;

        if (a.members.find(it => it.value == copy.value)) {
          if (copy.description) {
            copy.description = `${copy.description}\nFrom ${Naming.unwrap(a.name)}`;
          } else {
            copy.description = `Enum property from ${Naming.unwrap(a.name)}`;
          }
        }

        if (b.members.find(it => it.value == copy.value)) {
          const bUnwrapped = Naming.unwrap(b.name);
          if (unwrappedNew == bUnwrapped) {

            // This is not very accurate, but will eliminate most extraneous entries.
            continue;
          }

          if (copy.description) {
            copy.description = `${copy.description}\nFrom ${bUnwrapped}`;
          } else {
            copy.description = `Enum property from ${Naming.unwrap(bUnwrapped)}`;
          }
        }
      }

      const newEnum: OmniEnumType = {
        ...a,
        name: newEnumName,
        members: newMembers,
      };

      return {
        type: newEnum,
        diffs: [TypeDiffKind.MISSING_MEMBERS],
        created: true,
      };
    }

    return undefined;
  }

  public static mergeType<T extends OmniType>(from: T, to: T, features: TargetFeatures, lossless = true, aggregate = false): T {

    const combineOpt: CombineOptions = {
      create: lossless ? CreateMode.NONE : CreateMode.ANY,
      combine: lossless ? CombineMode.INTERSECTION : CombineMode.UNION,
    };

    if (from.kind === OmniTypeKind.OBJECT && to.kind === OmniTypeKind.OBJECT) {

      const copyTo: OmniObjectType = {...to, properties: [...to.properties]};

      // First we move over any properties.
      for (const fromProperty of (from.properties || [])) {
        this.mergePropertyToObject(from, fromProperty, copyTo, features, combineOpt, lossless);
      }

      // Then we will try to move over the superType.
      if (from.extendedBy && copyTo.extendedBy) {

        if (from.extendedBy.kind === OmniTypeKind.GENERIC_TARGET && copyTo.extendedBy.kind === OmniTypeKind.GENERIC_TARGET) {

          const commonGeneric = OmniUtil.getCommonDenominatorBetween(from.extendedBy, copyTo.extendedBy, features, combineOpt);
          if (commonGeneric?.type === from.extendedBy) {
            // No need to do anything; `from` and `to` have the same supertype.
          } else if (commonGeneric && commonGeneric.diffs?.includes(TypeDiffKind.NO_GENERIC_OVERLAP) && commonGeneric.type.kind === OmniTypeKind.GENERIC_TARGET) {

            // There is no real overlap between the different generic arguments. We need to merge generic argument types per-identifier with each other.
            const matching = OmniUtil.getMatchingTargetIdentifiers(from.extendedBy.targetIdentifiers, copyTo.extendedBy.targetIdentifiers);
            if (matching) {

              // We do the simple solution here, creating a union of the different generic targets.
              // It is up to other transformers to translate this into something that can be used in different targets.
              copyTo.extendedBy = {
                ...copyTo.extendedBy,
                targetIdentifiers: copyTo.extendedBy.targetIdentifiers.map(it => this.mapTargetIdentifier(it, matching, features, combineOpt)),
              };

              const a = Naming.getName(from);
              const b = Naming.getName(copyTo);

              const commonName = Naming.getCommonName([a, b]);

              if (commonName) {
                copyTo.name = commonName;
              }

            } else {
              logger.warn(`Could not match target identifiers between ${OmniUtil.describe(from)} and ${OmniUtil.describe(to)}, will not be able to merge them`);
            }
          } else {
            logger.warn(`Do not know how to merge supertype of ${OmniUtil.describe(from)} into ${OmniUtil.describe(to)}`);
          }
        }

      } else if (from.extendedBy && !copyTo.extendedBy) {
        copyTo.extendedBy = from.extendedBy;
      }

      return copyTo as T;

    } else if (OmniUtil.isPrimitive(from) && OmniUtil.isPrimitive(to)) {

      const common = OmniUtil.getCommonDenominatorBetween(from, to, features, combineOpt);
      if (common?.type === from) {
        return to;
      }

      const diffs = common ? (common.diffs ?? []) : [TypeDiffKind.FUNDAMENTAL_TYPE];
      if (common && diffs.length == 0) {
        return common.type as T;
      }

      throw new Error(`Could not merge from ${OmniUtil.describe(from)} to ${OmniUtil.describe(to)}, because of diffs: ${diffs}`);

    } else if (from.kind === OmniTypeKind.ENUM && to.kind === OmniTypeKind.ENUM) {

      // TODO: Implement this!
      logger.warn(`It is not yet supported to merge enums. ${OmniUtil.describe(from)} to ${OmniUtil.describe(to)}`);
    }

    return to;
  }

  private static mapTargetIdentifier(
    it: OmniGenericTargetIdentifierType,
    matching: ReadonlyArray<TargetIdentifierTuple>,
    features: TargetFeatures,
    combineOpt?: CombineOptions,
  ): OmniGenericTargetIdentifierType {

    const foundMatches = matching.find(m => m.a.sourceIdentifier === it.sourceIdentifier);
    if (foundMatches) {

      const skipSelf = (it.type.kind === OmniTypeKind.UNION);
      const unionTypes: Array<OmniType> = (it.type.kind === OmniTypeKind.UNION) ? [...it.type.types] : [];

      for (const toAdd of [foundMatches.a, foundMatches.b]) {

        if (skipSelf && toAdd === it) {
          // Can this be avoided? The logic seems flawed.
          continue;
        }

        const found = unionTypes.find(t => OmniUtil.getCommonDenominatorBetween(t, toAdd.type, features, combineOpt)?.type === t);
        if (!found) {
          unionTypes.push(toAdd.type);
        } else {
          logger.trace(`Not adding ${OmniUtil.describe(toAdd)} since it is already part of the union of he generic`);
        }
      }

      const commonName = Naming.getCommonName(unionTypes.map(it => Naming.getName(it)));

      // logger.info(`Common of all = ${JSON.stringify(commonName, undefined, 2)}`);
      // if (commonName) {
      //   union.name = commonName;
      // }

      let union: StrictReadonly<OmniCompositionType>;
      if (it.type.kind === OmniTypeKind.UNION) {
        union = {...it.type, name: commonName ?? it.type.name, types: unionTypes};
      } else {
        union = {kind: OmniTypeKind.UNION, name: commonName, types: unionTypes};
      }

      return {
        ...it,
        type: OmniUtil.asWriteable(union),
      };

    } else {

      // Return what we already have, and hope it works well.
      return it;
    }
  }

  private static mergePropertyToObject(from: OmniObjectType, property: OmniProperty, to: OmniObjectType, features: TargetFeatures, combineOpt: CombineOptions, lossless: boolean) {

    // TODO: Move below into `PropertyUtil`
    const toProperty = to.properties?.find(p => OmniUtil.isPropertyNameMatching(p.name, property.name));
    if (!toProperty) {

      let newProperty: OmniProperty | undefined = undefined;

      if (!OmniUtil.isNullableType(property.type)) {

        const nullType: OmniType = {
          kind: OmniTypeKind.NULL,
        };

        const nullableDenominator = OmniUtil.getCommonDenominatorBetween(property.type, nullType, features, {...combineOpt, create: CreateMode.SIMPLE});
        const nullableType = nullableDenominator?.type ?? property.type;

        newProperty = {
          ...property,
          required: false,
          type: nullableType,
          readOnly: false,
          writeOnly: false,
          debug: OmniUtil.addDebug(property.debug, 'made nullable and writeable from merging'),
        };
      }

      const finalProperty = newProperty ?? property;

      if (finalProperty.description) {
        finalProperty.description = `${finalProperty.description}\nFrom ${Naming.unwrap(from.name)}`;
      } else {
        finalProperty.description = `Merged property from object ${Naming.unwrap(from.name)}`;
      }

      // This is a new property, and we should add it for `to`.
      PropertyUtil.addProperty(to, finalProperty);

    } else {

      // This property already exists, so we should try and find common type.
      const common = OmniUtil.getCommonDenominatorBetween(property.type, toProperty.type, features, combineOpt)?.type;
      if (common) {

        if (lossless && common !== property.type) {
          throw new Error(`Property '${OmniUtil.getPropertyName(toProperty.name, true)}' already exists, but with different type, and merging should be lossless`);
        }

        if (common !== property.type) {

          // We only need to add the property if it is different.
          // TODO: This should likely use PROPERTY DIFFERENCE and not TYPE DIFFERENCE! There might be significant changes to things like display name!
          if (to.properties) {
            const idx = to.properties.indexOf(toProperty);
            if (idx !== -1) {
              to.properties.splice(idx, 1);
            }
          }

          if (property.description) {
            property.description = `${property.description}\nFrom ${Naming.unwrap(from.name)}`;
          } else {
            property.description = `Property from object ${Naming.unwrap(from.name)}`;
          }

          PropertyUtil.addProperty(to, property, common);
        }
      } else {

        // TODO: Can we introduce generics here in some way?
        if (lossless) {
          const vsString = `${OmniUtil.describe(property.type)} vs ${OmniUtil.describe(toProperty.type)}`;
          const errMessage = `No common type for merging properties ${property.name}. ${vsString}`;
          throw new Error(errMessage);
        }
      }
    }
  }

  public static cloneAndCopyTypeMeta(toClone: OmniType & OmniOptionallyNamedType, toCopyMetaFrom: OmniType): typeof toClone {

    const cloned: typeof toClone = {
      ...toClone,
    };

    OmniUtil.mergeTypeMeta(toCopyMetaFrom, cloned, true, false);

    const newName = ('name' in toCopyMetaFrom ? toCopyMetaFrom.name : undefined) ?? toClone.name;
    if (newName) {
      cloned.name = newName;
    }

    return cloned;
  }

  public static getDiff(baseline: OmniType, other: OmniType, features: TargetFeatures): Diff[] {

    if (baseline == other) {
      return [];
    }

    if (baseline.kind === OmniTypeKind.OBJECT && other.kind === OmniTypeKind.OBJECT) {
      return this.getDiffOfObjects(baseline, other, features);
    } else {

      const common = OmniUtil.getCommonDenominatorBetween(baseline, other, features, {create: CreateMode.NONE});
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

        const propertyCommon = OmniUtil.getCommonDenominatorBetween(baseProperty.type, withSameName.type, features, {create: CreateMode.NONE});
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

  public static mergeTypeMeta<T extends OmniType>(from: T, to: typeof from, lossless = true, aggregate = false, important = false): typeof to {

    to.title = important
      ? (from.title || to.title)
      : (to.title || from.title);

    if (aggregate && to.summary && from.summary) {
      if (to.summary != from.summary) {
        to.summary = `${to.summary}, ${from.summary}`;
      }
    } else {
      to.summary = from.summary || to.summary;
    }

    if (to.description && from.description && !to.summary) {
      if (important) {
        to.summary = to.description;
        to.description = from.description;
      } else {
        to.summary = from.description;
      }
    } else if (aggregate && to.description && from.description && important) {
      if (to.description !== from.description && to.summary !== from.description) {
        to.description = `${to.description}, ${from.description}`;
      }
    } else if (aggregate && to.summary && from.description && !important) {
      if (to.description !== from.description && to.summary !== from.description) {
        to.summary = `${to.summary}, ${from.description}`;
      }
    } else {
      to.description = from.description || to.description;
    }

    if (from.examples) {
      if (!to.examples) {
        to.examples = [];
      }
      for (const example of from.examples) {
        if (!to.examples.includes(example)) {
          to.examples.push(example);
        }
      }
    }

    if (to.debug || from.debug) {
      to.debug = OmniUtil.addDebug(to.debug, from.debug);
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

  public static debugToString(value: DebugValue, mapper?: ((v: string) => string), separator = ', '): string | undefined {

    if (!value) {
      return undefined;
    }

    if (!Array.isArray(value)) {
      value = [value];
    }

    if (mapper) {
      return value.map(it => mapper(it)).join(separator);
    } else {
      return value.join(separator);
    }
  }

  public static debugToStrings<R>(value: DebugValue, mapper: ((v: string) => R)): ReadonlyArray<R> {

    if (!value) {
      return [];
    }

    if (!Array.isArray(value)) {
      value = [value];
    }

    return value.map(it => mapper(it));
  }

  /**
   * TODO: An env should decide if this function is no-op, to decrease overhead in "release"-mode
   */
  public static addDebug(previous: DebugValue, add: DebugValue): DebugValue {
    return OmniUtil.addTo(previous, add);
  }

  public static addDebugTo<T extends { debug?: DebugValue }>(obj: T, add: DebugValue): T {

    const newDebug = OmniUtil.addTo(obj.debug, add);
    if (newDebug === obj.debug) {
      return obj;
    } else {
      return {
        ...obj,
        debug: newDebug,
      };
    }
  }

  public static prefixDebug(previous: DebugValue, prefix: string | undefined): DebugValue {

    if (!prefix) {
      return previous;
    }

    if (previous) {
      if (Array.isArray(previous)) {
        return previous.map(it => `${prefix}${it}`);
      } else {
        return `${prefix}${previous}`;
      }
    } else {
      return undefined;
    }
  }

  public static addTo<T>(target: Arrayable<T> | undefined, value: Arrayable<T> | undefined): Arrayable<T> | undefined {

    if (target) {
      if (value) {
        if (Array.isArray(target)) {
          if (Array.isArray(value)) {
            target.push(...value);
          } else {
            if (target.length === 0 || target[target.length - 1] !== value) {
              target.push(value);
            }
          }
          return target;
        } else {
          if (Array.isArray(value)) {
            return [target, ...value];
          } else {
            if (target === value) {
              return target;
            }
            return [target, value];
          }
        }
      } else {
        return target;
      }
    } else {
      return value;
    }
  }

  public static copyName(from: OmniType, to: OmniType): void {

    if ('name' in from && 'name' in to) {
      to.name = from.name;
    }
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
    } else if (aResolved instanceof RegExp && bResolved instanceof RegExp) {
      return aResolved.source === bResolved.source;
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
    return OmniDescribeUtils.getPropertyNameOrPattern(name);
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

  public static isUnion(type: OmniType) { // : type is OmniTypeOf<T, typeof OmniTypeKind.EXCLUSIVE_UNION | typeof OmniTypeKind.UNION> {
    return type.kind === OmniTypeKind.UNION || type.kind === OmniTypeKind.EXCLUSIVE_UNION;
  }

  public static isComposition(type: StrictReadonly<OmniNode> | undefined) {
    return OmniTypeUtil.isComposition(type);
  }

  public static isType(type: StrictReadonly<OmniNode>): type is Extract<OmniType, { kind: typeof type.kind }> {
    return (type.kind in OmniTypeKind);
  }

  public static isAbstract(type: StrictReadonly<OmniType>): boolean {
    if (type.kind === OmniTypeKind.OBJECT) {
      return !!type.abstract;
    }

    return false;
  }

  public static isPrimitive<T extends StrictReadonly<OmniType>>(type: T | undefined): type is OmniTypeOf<T, OmniPrimitiveKinds> {
    return OmniTypeUtil.isPrimitive(type);
  }

  public static asNonNullableIfHasDefault<T extends MaybeReadonly<OmniType>>(type: T, features: TargetFeatures) {

    if (OmniUtil.isNullableType(type, features)) {
      if (!type.literal && type.value !== undefined) {

        // The field is not a literal but has a default value.
        // This means that the field itself should not have the same type as for example the constructor parameter.
        // Because it will be up to the constructor to set the field with the default value if a value is not given.
        return {
          ...type,
          // Make it not-nullable and remove the Default-value.
          // NOTE: Perhaps the Default-value should be kept, for the sake of preservation?
          nullable: false,
          literal: false,
          value: undefined,
          debug: OmniUtil.addDebug(type.debug, `Nullable non-literal made non-nullable (value was: ${type.value})`),
        };
      }
    }

    return type;
  }

  public static literalToGeneralPrettyString(value: OmniPrimitiveConstantValue | undefined, primitiveKind?: OmniPrimitiveKinds): string {

    if (value === undefined) {
      return 'undefined';
    }

    if (typeof value === 'string') {
      return (`"${value}"`);
    } else if (typeof value == 'boolean') {
      return (`${value ? 'true' : 'false'}`);
    } else if (value === null) {
      return (`null`);
    } else {
      if (primitiveKind !== undefined) {
        if (primitiveKind == OmniTypeKind.DOUBLE) {
          return (`${value}d`);
        } else if (primitiveKind == OmniTypeKind.FLOAT) {
          return (`${value}f`);
        } else if (primitiveKind == OmniTypeKind.LONG) {
          return (`${value}L`);
        } else if (primitiveKind == OmniTypeKind.INTEGER) {
          return (`${value}`);
        } else if (primitiveKind == OmniTypeKind.NUMBER) {
          // If the type is just 'number' we will have to hope type inference is good enough.
        }
      }
      return (`${value}`);
    }
  }

  /**
   * Get the direction of a type. Base direction is `Direction.OUT` (we are the client), but generated code could also be for `Direction.IN` (receiving server).
   *
   * This could flip some directions in the opposite direction.
   *
   * @param type - Type which might contain a direction
   * @param baseDirection - General direction of the code-user
   */
  public static getDirection(type: OmniType, baseDirection: Direction) {

    const typeDirection = (type.kind === OmniTypeKind.OBJECT) ? type.direction : Direction.BOTH;
    if (baseDirection === Direction.IN && typeDirection === Direction.OUT) {
      return Direction.IN;
    }

    return typeDirection;
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
