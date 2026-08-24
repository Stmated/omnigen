import {
  CommonDenominatorType,
  OmniArrayPropertiesByPositionType,
  OmniArrayType,
  OmniDictionaryType,
  OmniEnumMember,
  OmniEnumType,
  OmniExclusiveUnionType,
  OmniGenericTargetIdentifierType,
  OmniGenericTargetType,
  OmniHardcodedReferenceType,
  OmniObjectType,
  OmniPrimitiveType,
  OmniType,
  OmniTypeKind,
  OmniUnknownType,
  TargetFeatures,
  TypeDiffKind,
  UnknownKind,
} from '@omnigen/api';
import {CombineMode, CombineOptions, CreateMode} from '../util';
import {Naming} from './Naming';
import {OmniUtil} from './OmniUtil';

type CommonDenominatorOptions = { features: TargetFeatures } & CombineOptions;
type TargetIdentifierTuple = { a: OmniGenericTargetIdentifierType; b: OmniGenericTargetIdentifierType };

/** Investigates the common type shared by Omni model types. */
export class TypeInvestigator {

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
        const amount = TypeInvestigator.getDiffAmountSingle(diff);
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

  public static getCommonDenominator(options: TargetFeatures | CommonDenominatorOptions, types: ReadonlyArray<OmniType>): CommonDenominatorType | undefined {

    if (types.length === 0) {
      return undefined;
    }

    if (types.length === 1) {
      return {
        type: types[0],
      };
    }

    const opt: CommonDenominatorOptions = ('features' in options) ? options : {features: options, create: undefined};

    let commonDiffAmount = 0;
    let common: CommonDenominatorType = {
      type: types[0],
    };

    for (let i = 1; i < types.length; i++) {

      const denominator = TypeInvestigator.getCommonDenominatorBetween(common.type, types[i], opt.features, opt);
      if (!denominator) {
        return undefined;
      }

      const diffAmount = TypeInvestigator.getDiffAmount(denominator.diffs);
      if (TypeInvestigator.isUnknownFallback(denominator.type) && !TypeInvestigator.isUnknownFallback(common.type)) {
        continue;
      }

      if (diffAmount > commonDiffAmount) {
        commonDiffAmount = diffAmount;
        common = denominator;
      } else {
        common = {
          ...common,
          type: denominator.type,
        };
      }
    }

    return common;
  }

  private static isUnknownFallback(type: OmniType): boolean {

    if (type.kind === OmniTypeKind.UNKNOWN) {
      return true;
    }

    return type.kind === OmniTypeKind.GENERIC_TARGET
      && type.targetIdentifiers.some(identifier => TypeInvestigator.isUnknownFallback(identifier.type));
  }

  public static getCommonDenominatorBetween(
    a: OmniType,
    b: OmniType,
    features: TargetFeatures,
    opt?: CombineOptions,
  ): CommonDenominatorType | undefined {

    if (a == b) {
      return {type: a};
    }

    if ((a.kind == OmniTypeKind.NULL || a.kind == OmniTypeKind.VOID) && b.kind == a.kind) {
      return {type: a};
    }

    if (OmniUtil.isPrimitive(a) && OmniUtil.isPrimitive(b)) {
      return TypeInvestigator.getCommonDenominatorBetweenPrimitives(a, b, features, opt);
    } else if (a.kind == OmniTypeKind.HARDCODED_REFERENCE && b.kind == OmniTypeKind.HARDCODED_REFERENCE) {
      return TypeInvestigator.getCommonDenominatorBetweenHardcodedReferences(a, b, opt);
    } else if (a.kind == OmniTypeKind.ENUM && b.kind == OmniTypeKind.ENUM) {
      return TypeInvestigator.getCommonDenominatorBetweenEnums(a, b, opt);
    } else if (a.kind == OmniTypeKind.DICTIONARY && b.kind == OmniTypeKind.DICTIONARY) {
      return TypeInvestigator.getCommonDenominatorBetweenDictionaries(a, b, features, opt);
    } else if (a.kind == OmniTypeKind.ARRAY && b.kind == OmniTypeKind.ARRAY) {
      return TypeInvestigator.getCommonDenominatorBetweenArrays(a, b, features, opt);
    } else if (a.kind == OmniTypeKind.UNKNOWN && b.kind == OmniTypeKind.UNKNOWN) {
      return this.getCommonDenominatorBetweenUnknowns(a, b, opt);
    } else if (a.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION && b.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      return TypeInvestigator.getCommonDenominatorBetweenPropertiesByPosition(a, b, features, opt);
    } else if (a.kind == OmniTypeKind.OBJECT && b.kind == OmniTypeKind.OBJECT) {
      const result = TypeInvestigator.getCommonDenominatorBetweenObjects(a, b, features, opt);
      if (result) {
        return result;
      }
    }

    if (a.kind == OmniTypeKind.OBJECT || b.kind == OmniTypeKind.OBJECT) {
      return this.getCommonDenominatorBetweenObjectAndOther(a, b, features, opt);
    } else if (a.kind == OmniTypeKind.GENERIC_TARGET) {
      if (b.kind == OmniTypeKind.GENERIC_TARGET) {
        return TypeInvestigator.getCommonDenominatorBetweenGenericTargets(a, b, features, opt);
      }
    } else if ((a.kind == OmniTypeKind.ENUM || OmniUtil.isPrimitive(a)) && (b.kind == OmniTypeKind.ENUM || OmniUtil.isPrimitive(b))) {

      const enumOption = (a.kind == OmniTypeKind.ENUM) ? a : (b.kind == OmniTypeKind.ENUM) ? b : undefined;
      const primitiveOption = (OmniUtil.isPrimitive(a)) ? a : (OmniUtil.isPrimitive(b)) ? b : undefined;

      if (enumOption && primitiveOption) {
        return TypeInvestigator.getCommonDenominatorBetweenEnumAndPrimitive(enumOption, primitiveOption, opt);
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
    a: OmniExclusiveUnionType,
    b: OmniType,
    features: TargetFeatures,
  ): CommonDenominatorType | undefined {

    let common = TypeInvestigator.getCommonDenominatorBetween(a.types[0], b, features);
    for (let i = 1; i < a.types.length && common; i++) {
      common = TypeInvestigator.getCommonDenominatorBetween(common.type, a.types[i], features);
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

    if (TypeInvestigator.canCreate(opt, CreateMode.SIMPLE)) {
      const unknownType: OmniUnknownType = {kind: OmniTypeKind.UNKNOWN, unknownKind: UnknownKind.ANY};
      return {type: unknownType, diffs: [TypeDiffKind.ISOMORPHIC_TYPE]};
    }

    return undefined;
  }

  private static getCommonDenominatorBetweenEnumAndPrimitive(
    a: OmniEnumType,
    b: OmniPrimitiveType,
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
    a: OmniGenericTargetType,
    b: OmniGenericTargetType,
    targetFeatures: TargetFeatures,
    opt?: CombineOptions,
  ): CommonDenominatorType<OmniGenericTargetType> | undefined {

    if (a.source != b.source) {
      return undefined;
    }

    const commonTargetIdentifiers: OmniGenericTargetIdentifierType[] = [];

    const matching = TypeInvestigator.getMatchingTargetIdentifiers(a.targetIdentifiers, b.targetIdentifiers);
    if (matching.length != a.targetIdentifiers.length) {
      return undefined;
    }

    // TODO: Should check "create" if we are allowed to create new types like this -- and only create a new one if all generic arguments are not the same
    if (opt?.create === CreateMode.NONE) {
      return undefined;
    }

    const uniqueTargetIdentifierDiffs = new Set<TypeDiffKind>();
    for (const match of matching) {

      let commonIdentifierType = TypeInvestigator.getCommonDenominatorBetween(match.a.type, match.b.type, targetFeatures, opt);
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
    a: OmniType,
    b: OmniType,
    targetFeatures: TargetFeatures,
    opt?: CombineOptions,
  ): CommonDenominatorType | undefined {

    if (b.kind == OmniTypeKind.OBJECT && b.extendedBy) {

      // This will recursively search downwards in B's hierarchy.
      const common = TypeInvestigator.getCommonDenominatorBetween(a, b.extendedBy, targetFeatures, opt);
      if (common) {
        const diffs = [...(common.diffs ?? [])];
        if (!diffs.includes(TypeDiffKind.IS_SUPERTYPE)) {
          diffs.push(TypeDiffKind.IS_SUPERTYPE);
        }
        return {type: common.type, diffs: diffs};
      }
    }

    if (a.kind == OmniTypeKind.OBJECT && a.extendedBy) {
      const common = TypeInvestigator.getCommonDenominatorBetween(a.extendedBy, b, targetFeatures, opt);
      if (common) {
        return {type: common.type, diffs: [...(common.diffs ?? []), TypeDiffKind.IS_SUPERTYPE]};
      }
    }

    if (!TypeInvestigator.canCreate(opt, CreateMode.SIMPLE)) {
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
    opt?: CombineOptions,
  ): CommonDenominatorType<OmniArrayPropertiesByPositionType> | undefined {

    if (a.properties.length === b.properties.length) {

      const diffs: TypeDiffKind[] = [];
      for (let i = 0; i < a.properties.length; i++) {
        if (a.properties[i].name !== b.properties[i].name) {
          return undefined;
        }

        const common = TypeInvestigator.getCommonDenominatorBetween(a.properties[i].type, b.properties[i].type, targetFeatures, opt);
        if (!common || TypeInvestigator.isDisqualifyingDiffForCommonType(common.diffs)) {
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

    const common = TypeInvestigator.getCommonDenominatorBetween(a.of, b.of, targetFeatures, opt);
    if (common && !common?.diffs?.length) {
      return {type: a};
    }

    // NOTE: There might be some differences we can ignore; should check for them
    if (!TypeInvestigator.canCreate(opt, CreateMode.ANY) || !common) {
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
  ): CommonDenominatorType | undefined {

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
      return TypeInvestigator.getCommonDenominatorBetweenPrimitivesWithDifferentLiteralValues(a, b, common, targetFeatures, opt);
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
    features: TargetFeatures,
    opt?: CombineOptions,
  ): CommonDenominatorType | undefined {

    if (a.literal && b.literal) {

      if (features.literalTypes && TypeInvestigator.canCreate(opt, CreateMode.SIMPLE) && TypeInvestigator.canCombine(opt, CombineMode.UNION)) {
        const union: OmniExclusiveUnionType = {
          kind: OmniTypeKind.EXCLUSIVE_UNION,
          types: [a, b],
          debug: 'Created from two literals with different values, a polymorphic literal type',
        };

        return {
          type: union,
          diffs: [...(common.diffs ?? []), TypeDiffKind.POLYMORPHIC_LITERAL],
        };
      }

      const generalized = OmniUtil.getGeneralizedType(common.type ?? a, opt);
      if (generalized) {
        return {type: generalized, diffs: [...(common.diffs ?? []), TypeDiffKind.POLYMORPHIC_LITERAL]};
      } else {
        return undefined;
      }
    } else if (a.literal && !b.literal && common.type == a) {
      return {type: b, diffs: [...(common.diffs ?? []), TypeDiffKind.CONCRETE_VS_ABSTRACT]};
    } else if (!a.literal && b.literal && common.type == b) {
      return {type: a, diffs: [...(common.diffs ?? []), TypeDiffKind.CONCRETE_VS_ABSTRACT]};
    }

    // One is literal and the other not, then diff is Concrete vs Abstract -- otherwise it is a Polymorphic Literal.
    const diff = (a.literal !== b.literal) ? TypeDiffKind.CONCRETE_VS_ABSTRACT : TypeDiffKind.POLYMORPHIC_LITERAL;
    return {type: OmniUtil.getGeneralizedType(common.type ?? a, opt) ?? a, diffs: [...(common.diffs ?? []), diff]};

    // if (a.literal && b.literal) {
    //   if (common.type) {
    //     return {type: OmniUtil.getGeneralizedType(common.type, opt) ?? common.type, diffs: [...(common.diffs ?? []), TypeDiffKind.POLYMORPHIC_LITERAL]};
    //   } else {
    //
    //     if (features.literalTypes && TypeInvestigator.canCreate(opt, CreateMode.SIMPLE) && TypeInvestigator.canCombine(opt, CombineMode.UNION)) {

    //     }
    //
    //     const generalizedA = OmniUtil.getGeneralizedType(a, opt);
    //     const generalizedB = OmniUtil.getGeneralizedType(b, opt);
    //
    //     if (generalizedA && generalizedB) {
    //
    //       const commonGeneralized = TypeInvestigator.getCommonDenominatorBetween(generalizedA, generalizedB, features, opt);
    //       if (commonGeneralized) {
    //         return {type: commonGeneralized.type, diffs: [...(common.diffs ?? []), ...(commonGeneralized.diffs ?? []), TypeDiffKind.POLYMORPHIC_LITERAL]};
    //       }
    //     }
    //
    //     // return undefined;
    //   }
    // } else if (a.literal && !b.literal && common.type === a) {
    //   return {type: b, diffs: [...(common.diffs ?? []), TypeDiffKind.CONCRETE_VS_ABSTRACT]};
    // } else if (!a.literal && b.literal && common.type === b) {
    //   return {type: a, diffs: [...(common.diffs ?? []), TypeDiffKind.CONCRETE_VS_ABSTRACT]};
    // }
    //
    // // One is literal and the other not, then diff is Concrete vs Abstract -- otherwise it is a Polymorphic Literal.
    // const diff = (a.literal !== b.literal) ? TypeDiffKind.CONCRETE_VS_ABSTRACT : TypeDiffKind.POLYMORPHIC_LITERAL;
    // const commonOrA = common.type ?? a;
    // return {type: OmniUtil.getGeneralizedType(commonOrA, opt) ?? commonOrA, diffs: [...(common.diffs ?? []), diff]};
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
        const created = OmniUtil.toReferenceType(b, opt);
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

    const commonKey = TypeInvestigator.getCommonDenominatorBetween(a.keyType, b.keyType, targetFeatures, opt);
    if (commonKey) {
      const commonValue = TypeInvestigator.getCommonDenominatorBetween(a.valueType, b.valueType, targetFeatures, opt);
      if (commonValue) {
        if (commonKey.type == a.keyType && commonValue.type == a.valueType) {
          return {
            type: a,
            diffs: [...(commonKey.diffs ?? []), ...(commonValue.diffs ?? [])],
          };
        }

        if (!TypeInvestigator.canCreate(opt, CreateMode.ANY)) {
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

  private static getCommonDenominatorBetweenObjects(
    a: OmniObjectType,
    b: OmniObjectType,
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

  private static getCommonDenominatorBetweenEnums(
    a: OmniEnumType,
    b: OmniEnumType,
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
      return {type: a};
    }

    const canCombineToUnion = TypeInvestigator.canCombine(opt, CombineMode.UNION);
    if (extra.length > 0 && !canCombineToUnion) {
      return undefined;
    }

    if (TypeInvestigator.canCreate(opt, CreateMode.ANY)) {

      let newEnumName = Naming.getCommonName([a.name, b.name]);
      if (!newEnumName) {
        if (canCombineToUnion) {
          newEnumName = {prefix: a.name, name: {prefix: 'And', name: b.name}};
        } else {
          // This name is bad. Hopefully if the enums are to be an intersection, they have a common name part.
          newEnumName = {prefix: a.name, name: {prefix: 'AndCommonOf', name: b.name}};
        }
      }

      const unwrappedNew = Naming.unwrap(newEnumName);

      const newMembers: OmniEnumMember[] = canCombineToUnion
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
      };
    }

    return undefined;
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

}
