import {
  Arrayable,
  DebugValue,
  Direction,
  Namespace,
  NamespaceArrayItem,
  ObjectEdgeName,
  ObjectName,
  OmniAccessLevel,
  OmniCompositionType,
  OmniDecoratingType,
  OmniExternalModelReferenceType,
  OmniGenericTargetIdentifierType,
  OmniModel,
  OmniNode,
  OmniObjectType,
  OmniOptionallyNamedType,
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
  SmartUnwrappedType,
  TargetFeatures,
  TypeDiffKind,
  TypeName,
  TypeUseKind,
} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {Naming} from './Naming';
import {assertUnreachable, CombineMode, CombineOptions, CreateMode} from '../util';
import {PropertyUtil} from './PropertyUtil';
import {ProxyReducerOmni2} from '../reducer2/ProxyReducerOmni2.ts';
import {ANY_KIND} from '../reducer2/types.ts';
import {OmniTypeUtil} from './OmniTypeUtil.ts';
import {OmniDescribeUtils} from './OmniDescribeUtils.ts';
import {TypeInvestigator} from './TypeInvestigator';

const logger = LoggerFactory.create(import.meta.url);

export interface TypeCollection {

  named: OmniType[];
  all: OmniType[];
  edge: OmniType[];
}

export type TargetIdentifierTuple = { a: OmniGenericTargetIdentifierType; b: OmniGenericTargetIdentifierType };

type CommonDenominatorOptions = { features: TargetFeatures } & CombineOptions;

const EMPTY_ARRAY: ReadonlyArray<any> = Object.freeze([]);

export class OmniUtil {

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

  public static asSubType(type: OmniNode | undefined): type is OmniSubTypeCapableType {

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
          types.push(n);
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

  public static isCompletelyEmptyType(type: OmniType): boolean {

    if (OmniUtil.isEmptyType(type)) {
      if (type.kind === OmniTypeKind.OBJECT && !type.extendedBy && !type.subTypeHints && !type.description && !type.summary) {
        return true;
      }
    }

    return false;
  }

  public static hasMeta(type: OmniType): boolean {

    type ObjectKeys = keyof OmniObjectType;
    return (('name' satisfies ObjectKeys) in type && !!type.name)
      || (('description' satisfies ObjectKeys) in type && !!type.description)
      || (('summary' satisfies ObjectKeys) in type && !!type.summary)
      || (('title' satisfies ObjectKeys) in type && !!type.title);
  }

  public static isNull(type: OmniType) {
    return type.kind === OmniTypeKind.NULL;
  }

  public static isUndefined(type: OmniType) {
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
  public static describe(type: OmniType | undefined): string {
    return OmniDescribeUtils.describe(type);
  }

  public static isNullableType(type: OmniType, features?: TargetFeatures): type is ((OmniPrimitiveType & { nullable: true }) | OmniPrimitiveNull) {
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
  public static getVirtualTypeName(type: OmniType, depth?: number): TypeName {
    return OmniDescribeUtils.getVirtualTypeName(type, depth);
  }

  public static toReferenceType<T extends OmniType>(type: T): T;
  public static toReferenceType<T extends OmniType>(type: T, combOpt: CombineOptions | undefined): T | undefined;
  public static toReferenceType<T extends OmniType>(type: T, combOpt?: CombineOptions | undefined): T | undefined {

    if (combOpt === undefined) {
      combOpt = {create: CreateMode.SIMPLE};
    }

    if (type.kind === OmniTypeKind.DECORATING) {

      const ofAsRef = OmniUtil.toReferenceType(type.of, combOpt);
      if (!ofAsRef || ofAsRef === type.of) {
        return type;
      }

      if (!OmniUtil.canCreate(combOpt, CreateMode.SIMPLE)) {
        return undefined;
      }

      return ({
        ...type,
        of: ofAsRef,
        debug: OmniUtil.addDebug(type.debug, `Setting nullable=true to decorating type to make underlying a reference type`),
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

      if (!OmniUtil.canCreate(combOpt, CreateMode.SIMPLE)) {
        return undefined;
      }

      return {
        ...type,
        nullable: true,
        debug: OmniUtil.addDebug(type.debug, `Setting nullable=true to make it a reference type`),
      } satisfies OmniPrimitiveType;
    }

    return type;
  }









  public static isNameable(type: OmniType) {

    return type.kind === OmniTypeKind.OBJECT
      || type.kind === OmniTypeKind.INTERFACE
      || type.kind === OmniTypeKind.ENUM
      || type.kind === OmniTypeKind.ARRAY
      || type.kind === OmniTypeKind.DECORATING
      || type.kind === OmniTypeKind.UNION
      || type.kind === OmniTypeKind.EXCLUSIVE_UNION
      || type.kind === OmniTypeKind.INTERSECTION
      || OmniUtil.isPrimitive(type);
  }

  public static isExtendable(type: OmniType) {

    return type.kind === OmniTypeKind.OBJECT
      || type.kind === OmniTypeKind.INTERFACE
      || type.kind === OmniTypeKind.ENUM;
  }

  /**
   * TODO: This could probably be improved by a whole lot; there are likely an unnecessary amount of comparisons
   */
  public static getDistinctTypes(
    types: ReadonlyArray<OmniType>,
    targetFeatures: TargetFeatures,
    allowedDiffPredicate: (diff: TypeDiffKind) => boolean = () => false,
  ) {

    const distinctTypes: Array<OmniType> = [];
    for (const type of types) {

      const opt = Object.freeze({create: CreateMode.NONE, combine: CombineMode.NONE});
      const sameType = distinctTypes.find(it => {
        const common = TypeInvestigator.getCommonDenominatorBetween(type, it, targetFeatures, opt);
        if (!common) {
          return false;
        }

        if (!common.diffs?.length) {
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

  public static getGeneralizedType<T extends OmniType>(type: T, opt?: CombineOptions): T | undefined {

    if (OmniUtil.isPrimitive(type) && type.value !== undefined) {

      if (!OmniUtil.canCreate(opt, CreateMode.DOWNGRADE)) {
        return undefined;
      }

      const generalizedPrimitive: typeof type = {
        ...type,
      };
      delete generalizedPrimitive.value;
      delete generalizedPrimitive.literal;

      return generalizedPrimitive;
    }

    return type;
  }

  private static canCreate(opt: CombineOptions | undefined, match: CreateMode): boolean {

    const create = opt?.create ?? CreateMode.NONE;
    if (create === CreateMode.ANY) {
      return true;
    }
    if (match === CreateMode.DOWNGRADE && create === CreateMode.SIMPLE) {
      return true;
    }
    return create === match;
  }

  private static canCombine(opt: CombineOptions | undefined, match: CombineMode): boolean {

    const combine = opt?.combine ?? CombineMode.INTERSECTION;
    return (combine === CombineMode.ANY) || combine === match;
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

          const commonGeneric = TypeInvestigator.getCommonDenominatorBetween(from.extendedBy, copyTo.extendedBy, features, combineOpt);
          if (commonGeneric?.type === from.extendedBy) {
            // No need to do anything; `from` and `to` have the same supertype.
          } else if (commonGeneric && commonGeneric.diffs?.includes(TypeDiffKind.NO_GENERIC_OVERLAP) && commonGeneric.type.kind === OmniTypeKind.GENERIC_TARGET) {

            // There is no real overlap between the different generic arguments. We need to merge generic argument types per-identifier with each other.
            const matching = TypeInvestigator.getMatchingTargetIdentifiers(from.extendedBy.targetIdentifiers, copyTo.extendedBy.targetIdentifiers);
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

      const common = TypeInvestigator.getCommonDenominatorBetween(from, to, features, combineOpt);
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

        const found = unionTypes.find(t => TypeInvestigator.getCommonDenominatorBetween(t, toAdd.type, features, combineOpt)?.type === t);
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

      let union: OmniCompositionType;
      if (it.type.kind === OmniTypeKind.UNION) {
        union = {...it.type, name: commonName ?? it.type.name, types: unionTypes};
      } else {
        union = {kind: OmniTypeKind.UNION, name: commonName, types: unionTypes};
      }

      return {
        ...it,
        type: union,
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

        const nullableDenominator = TypeInvestigator.getCommonDenominatorBetween(property.type, nullType, features, {...combineOpt, create: CreateMode.SIMPLE});
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
      const common = TypeInvestigator.getCommonDenominatorBetween(property.type, toProperty.type, features, combineOpt)?.type;
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

      const common = TypeInvestigator.getCommonDenominatorBetween(baseline, other, features, {create: CreateMode.NONE});
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

  public static getDiffStrings(diffs: Diff[]): string[] {

    const diffStrings: string[] = [];
    for (const diff of diffs) {
      switch (diff.kind) {
        case DiffKind.MISSING_PROPERTY:
          diffStrings.push(`Missing property: ${diff.propertyName}`);
          break;
        case DiffKind.EXTRA_PROPERTY:
          diffStrings.push(`Extra property: ${diff.propertyName}`);
          break;
        case DiffKind.PROPERTY_TYPE:
          diffStrings.push(`Property type difference: ${diff.propertyName}`);
          break;
        case DiffKind.TYPE:
          const strings: string[] = [];
          for (const typeDiff of diff.typeDiffs ?? []) {
            strings.push(`${typeDiff}`);
          }
          diffStrings.push(`Type difference: ${strings.join(', ')}`);
          break;
      }
    }

    return diffStrings;
  }

  public static getDiffOfObjects(baseline: OmniObjectType, other: OmniObjectType, features: TargetFeatures): Diff[] {

    const diffs: Diff[] = [];

    const baseProperties = OmniUtil.getPropertiesOf(baseline);
    const otherProperties = OmniUtil.getPropertiesOf(other);

    for (const baseProperty of baseProperties) {

      const withSameName = otherProperties.find(it => (it.name == baseProperty.name));
      if (withSameName) {

        const propertyCommon = TypeInvestigator.getCommonDenominatorBetween(baseProperty.type, withSameName.type, features, {create: CreateMode.NONE});
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

    if (from.title || to.title) {
      to.title = (important ? from : to).title || (important ? to : from).title;
    }

    if (important) {
      to.description = OmniUtil.addTo(from.description, to.description);
      to.summary = OmniUtil.addTo(from.summary, to.summary);
    } else {
      to.description = OmniUtil.addTo(to.description, from.description);
      to.summary = OmniUtil.addTo(to.summary, from.summary);
    }

    if (from.examples?.length) {
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

  /**
   * MUTATES the given debug-value owner, and returns the same object as was given.
   */
  public static addDebugTo<T extends { debug?: DebugValue }>(obj: T, add: DebugValue): T {

    const newDebug = OmniUtil.addTo(obj.debug, add);
    if (newDebug === obj.debug) {
      return obj;
    } else {
      obj.debug = newDebug;
      return obj;
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

  public static prependTo<T>(target: Array<T>, value: Arrayable<T>): void {

    if (Array.isArray(value)) {
      target.splice(0, 0, ...value);
    } else {
      target.splice(0, 0, value);
    }
  }

  public static appendTo<T>(target: Array<T>, value: Arrayable<T>): void {

    if (Array.isArray(value)) {
      target.push(...value);
    } else {
      target.push(value);
    }
  }

  public static simplifyArray<T>(array: Array<T>): Arrayable<T> {

    if (array.length === 1) {
      return array[0];
    }

    return array;
  }

  public static forEach<T>(array: Arrayable<T> | undefined, callback: (v: T, idx: number) => void): void {

    if (array) {
      if (Array.isArray(array)) {
        array.forEach(callback);
      } else {
        callback(array, 0);
      }
    }
  }

  public static deleteFromArrayable<T>(arrayable: Arrayable<T> | undefined, needle: Arrayable<T> | undefined): Arrayable<T> | undefined {

    if (!arrayable) {
      return undefined;
    }

    if (Array.isArray(arrayable)) {
      if (Array.isArray(needle)) {
        return OmniUtil.simplifyArray(arrayable.filter(it => !needle.includes(it)));
      } else {
        return OmniUtil.simplifyArray(arrayable.filter(it => it != needle));
      }
    } else if (arrayable && Array.isArray(needle)) {
      if (needle.includes(arrayable)) {
        return undefined;
      } else {
        return arrayable;
      }
    } else if (arrayable === needle) {
      return undefined;
    }

    return arrayable;
  }

  public static isEmpty<T>(arrayable: Arrayable<T> | undefined): boolean {

    if (arrayable !== undefined) {
      if (Array.isArray(arrayable)) {
        return arrayable.length > 0;
      }

      return !Boolean(arrayable);
    }

    return false;
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

    if (OmniUtil.isNameable(from) && OmniUtil.isNameable(to)) {
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

  public static isComposition(type: OmniNode | undefined) {
    return OmniTypeUtil.isComposition(type);
  }

  public static isType(type: OmniNode): type is Extract<OmniType, { kind: typeof type.kind }> {
    return (type.kind in OmniTypeKind);
  }

  public static isAbstract(type: OmniType): boolean {
    if (type.kind === OmniTypeKind.OBJECT) {
      return !!type.abstract;
    }

    return false;
  }

  public static isPrimitive<T extends OmniType>(type: T | undefined): type is OmniTypeOf<T, OmniPrimitiveKinds> {
    return OmniTypeUtil.isPrimitive(type);
  }

  public static asNonNullableIfHasDefault<T extends OmniType>(type: T, features: TargetFeatures) {

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

export type Diff
  = PropertyDiff
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
