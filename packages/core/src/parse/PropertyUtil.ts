import {
  OmniItemKind,
  OmniOwnedProperty,
  OmniProperty,
  OmniPropertyName,
  OmniPropertyOwner,
  OmniType,
  OmniTypeKind,
  PartialProp,
  PropertiesInformation,
  PropertyDifference,
  PropertyEquality, StrictReadonly,
  TargetFeatures,
  TypeDiffKind,
} from '@omnigen/api';
import {OmniUtil} from './OmniUtil.js';
import {CombineOptions, CreateMode} from '../util';
import {LoggerFactory} from '@omnigen/core-log';

type NonNullableProperties<T> = { [P in keyof T]-?: NonNullable<T[P]>; };

const logger = LoggerFactory.create(import.meta.url);

export class PropertyUtil {

  public static addProperty(owner: OmniPropertyOwner, property: PartialProp<OmniProperty, 'kind'>, as?: StrictReadonly<OmniType>): OmniProperty {

    let propertyWithOwner: OmniProperty;
    if (property.kind && !as) {
      propertyWithOwner = property as OmniProperty;
    } else {
      propertyWithOwner = {
        ...property,
        kind: property.kind ?? OmniItemKind.PROPERTY,
        type: as ?? property.type,
      };
    }

    owner.properties.push(propertyWithOwner);

    return propertyWithOwner;
  }

  public static isDiffMatch(diffs: PropertyDifference, needles: ReadonlyArray<PropertyDifference>): boolean {

    for (const needle of needles) {
      if (diffs === needle) {
        return true;
      }

      if (needle == PropertyDifference.SIGNATURE) {
        if (diffs === PropertyDifference.TYPE || diffs === PropertyDifference.NAME || diffs === PropertyDifference.META) {
          return true;
        }
      }
    }

    return false;
  }

  public static getCommonProperties(
    bannedTypeDiff: (diff: TypeDiffKind) => boolean,
    bannedPropDiff: (diff: PropertyDifference) => boolean,
    targetFeatures: TargetFeatures,
    combineOpt?: CombineOptions,
    ...types: OmniType[]
  ): PropertiesInformation {

    let commonPropertyNames: Array<OmniPropertyName> | undefined = undefined;
    const pairs: Array<StrictReadonly<OmniOwnedProperty>[]> = types.filter(OmniUtil.isPropertyOwner).map(t => {
      return OmniUtil.getPropertiesOf(t).map(p => ({
        owner: t,
        property: p,
      }));
    });
    for (const properties of pairs) {

      const propertyNames = properties.map(p => p.property.name); // .filter(isDefined);
      if (commonPropertyNames == undefined) {
        commonPropertyNames = propertyNames;
      } else {
        commonPropertyNames = commonPropertyNames.filter(name => propertyNames.some(pn => OmniUtil.isPropertyNameEqual(pn, name))); // .includes(name));
      }

      if (propertyNames.length <= 0) {

        // If there are no common properties left, then no reason to go on.
        break;
      }
    }

    // const hasPatternProp = pairs.some(it => it.some(it2 => OmniUtil.isPatternPropertyName(it2.property.name)));
    // if (hasPatternProp) {
    //   logger.info(`Handling properties:\n${pairs.map(it => it.flatMap(it2 => `${OmniUtil.describe(it2.owner)} ${OmniUtil.getPropertyName(it2.property.name, true)}`).join(' + ')).join('\n')}\n-- left: ${commonPropertyNames?.map(it => OmniUtil.getPropertyName(it, true)).join(', ')}`);
    // }

    const information: PropertiesInformation = {
      byPropertyName: {},
    };

    for (const propertyName of (commonPropertyNames || [])) {

      const commonPropertiesWithSameName = pairs.flatMap(
        perType => perType.filter(p => OmniUtil.isPropertyNameEqual(p.property.name, propertyName)),
      );

      const propertyEquality = this.getLowestAllowedPropertyEquality(
        commonPropertiesWithSameName.map(it => it.property),
        bannedTypeDiff,
        bannedPropDiff,
        targetFeatures,
        combineOpt,
      );

      // if (hasPatternProp) {
      //   logger.info(`${OmniUtil.getPropertyName(propertyName, true)} -- ${propertyEquality ? getShallowPayloadString(propertyEquality) : 'n/a'}`);
      // }

      if (propertyEquality) {

        const distinctTypes = OmniUtil.getDistinctTypes(
          commonPropertiesWithSameName.map(it => it.property.type),
          targetFeatures,
        );

        const stringPropertyName = OmniUtil.getPropertyName(propertyName, true);
        information.byPropertyName[stringPropertyName] = {
          propertyName: propertyName,
          properties: commonPropertiesWithSameName,
          propertyDiffs: propertyEquality.propertyDiffs,
          typeDiffs: propertyEquality.typeDiffs,
          commonType: propertyEquality.type || {kind: OmniTypeKind.UNKNOWN},
          distinctTypes: distinctTypes,
        };
      }
    }

    return information;
  }

  private static getLowestAllowedPropertyEquality(
    properties: OmniProperty[],
    bannedTypeDiff: (diff: TypeDiffKind) => boolean,
    bannedPropDiff: (diff: PropertyDifference) => boolean,
    targetFeatures: TargetFeatures,
    combineOpt?: CombineOptions,
  ): PropertyEquality | undefined {

    const propertyEquality: NonNullableProperties<PropertyEquality> = {
      typeDiffs: [],
      propertyDiffs: [],
      type: {kind: OmniTypeKind.UNKNOWN},
    };

    if (properties.length == 1) {

      return {
        ...propertyEquality,
        type: properties[0].type,
      };

      // propertyEquality.type = properties[0].type;
      // return propertyEquality;
    }

    const possiblePropertyTypes: Array<StrictReadonly<OmniType>> = [];
    for (let i = 0; i < properties.length; i++) {

      // NOTE: Need good test cases for this, to check that it really finds the lowest equality level
      const current = properties[i];
      if (i == properties.length - 1) {

        // This is the last property. There is no next to compare to.
        possiblePropertyTypes.push(current.type);
        continue;
      }

      const next = properties[i + 1];

      const equalityLevel = PropertyUtil.getPropertyEquality(current, next, targetFeatures, combineOpt);

      if (equalityLevel.propertyDiffs?.find(it => bannedPropDiff(it))) {
        return undefined;
      }

      if (equalityLevel.typeDiffs?.find(it => bannedTypeDiff(it))) {
        return undefined;
      }

      if (equalityLevel.type) {
        possiblePropertyTypes.push(equalityLevel.type);
      }

      if (equalityLevel.typeDiffs) {
        for (const diff of equalityLevel.typeDiffs) {
          if (!propertyEquality.typeDiffs.includes(diff)) {
            propertyEquality.typeDiffs.push(diff);
          }
        }
      }

      if (equalityLevel.propertyDiffs) {
        for (const diff of equalityLevel.propertyDiffs) {
          if (!propertyEquality.propertyDiffs.includes(diff)) {
            propertyEquality.propertyDiffs.push(diff);
          }
        }
      }
    }

    const commonType = OmniUtil.getCommonDenominator({features: targetFeatures}, possiblePropertyTypes);
    if (commonType) {

      // We still want to keep the diffs that we collected.
      // But we also want the common type between the different properties that we have found.
      propertyEquality.type = commonType.type;
      propertyEquality.typeDiffs = [...propertyEquality.typeDiffs, ...(commonType.diffs ?? [])];
    }

    return propertyEquality;
  }

  public static getPropertyEquality(
    a: OmniProperty,
    b: OmniProperty,
    targetFeatures: TargetFeatures,
    combineOptions: CombineOptions = {create: CreateMode.NONE},
  ): PropertyEquality {

    if (a == b) {
      return {type: a.type};
    }

    if (!OmniUtil.isPropertyNameMatching(a.name, b.name)) {
      return {propertyDiffs: [PropertyDifference.NAME]};
    }

    let commonType = OmniUtil.getCommonDenominatorBetween(a.type, b.type, targetFeatures, combineOptions);
    if (!commonType) {

      // If no common type was found, we will set the type to UNKNOWN, and level to NOT_EQUAL.
      // The caller might still want to know how good a match the property is, and actually use the type as unknown.
      commonType = {type: {kind: OmniTypeKind.UNKNOWN}, diffs: [TypeDiffKind.FUNDAMENTAL_TYPE]};
    }

    if (a.required != b.required) {
      return {
        propertyDiffs: [PropertyDifference.REQUIRED],
        typeDiffs: commonType.diffs,
        type: commonType.type,
      };
    }

    const aAccessorName = OmniUtil.getPropertyAccessorNameOnly(a.name);
    const bAccessorName = OmniUtil.getPropertyAccessorNameOnly(b.name);

    const aFieldName = OmniUtil.getPropertyFieldNameOnly(a.name);
    const bFieldName = OmniUtil.getPropertyFieldNameOnly(b.name);

    if (((aAccessorName || bAccessorName) && aAccessorName != bAccessorName)
      || ((aFieldName || bFieldName) && aFieldName != bFieldName)) {
      return {
        propertyDiffs: [PropertyDifference.FIELD_NAME],
        typeDiffs: commonType.diffs,
        type: commonType.type,
      };
    }

    if (a.description !== b.description) {
      return {
        propertyDiffs: [PropertyDifference.META],
        typeDiffs: commonType.diffs,
        type: commonType.type,
      };
    }

    return {
      propertyDiffs: [],
      typeDiffs: commonType.diffs,
      type: commonType.type,
    };
  }
}
