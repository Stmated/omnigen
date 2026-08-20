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
  PropertyEquality,
  TargetFeatures,
  TypeDiffKind,
} from '@omnigen/api';
import {OmniUtil} from './OmniUtil.js';
import {CombineMode, CombineOptions, CreateMode} from '../util';
import {LoggerFactory} from '@omnigen/core-log';

type NonNullableProperties<T> = { [P in keyof T]-?: NonNullable<T[P]>; };

const logger = LoggerFactory.create(import.meta.url);

export class PropertyUtil {

  public static addProperty(owner: OmniPropertyOwner, property: PartialProp<OmniProperty, 'kind'>, as?: OmniType): OmniProperty {

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
    const pairs: Array<OmniOwnedProperty[]> = types.filter(OmniUtil.isPropertyOwner).map(t => {
      return OmniUtil.getPropertiesOf(t).map(p => ({
        owner: t,
        property: p,
      }));
    });

    for (const properties of pairs) {

      const propertyNames = properties.map(p => p.property.name);
      if (commonPropertyNames == undefined) {
        commonPropertyNames = propertyNames;
      } else {
        commonPropertyNames = commonPropertyNames.filter(name => propertyNames.some(pn => OmniUtil.isPropertyNameEqual(pn, name)));
      }

      if (propertyNames.length <= 0) {

        // If there are no common properties left, then no reason to go on.
        break;
      }
    }

    const information: PropertiesInformation = {
      byPropertyName: {},
    };

    for (const propertyName of (commonPropertyNames || [])) {

      const sameNameWithOwner = pairs.flatMap(
        perType => perType.filter(p => OmniUtil.isPropertyNameEqual(p.property.name, propertyName)),
      );

      const sameName = sameNameWithOwner.map(it => it.property);
      const propertyEquality = this.getLowestAllowedPropertyEquality(sameName, bannedTypeDiff, bannedPropDiff, targetFeatures, combineOpt);

      if (propertyEquality) {

        const distinctTypes = OmniUtil.getDistinctTypes(
          sameNameWithOwner.map(it => it.property.type),
          targetFeatures,
        );

        const commonType = propertyEquality.commonType || {kind: OmniTypeKind.UNKNOWN};

        const stringPropertyName = OmniUtil.getPropertyName(propertyName, true);
        information.byPropertyName[stringPropertyName] = {
          propertyName: propertyName,
          properties: sameNameWithOwner,
          propertyDiffs: propertyEquality.propertyDiffs,
          typeDiffs: propertyEquality.typeDiffs,
          commonType: commonType,
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

    const propertyEquality: PropertyEquality = {
      typeDiffs: [],
      propertyDiffs: [],
      // type: {kind: OmniTypeKind.UNKNOWN},
    };

    if (properties.length === 1) {

      return {
        ...propertyEquality,
        commonType: properties[0].type,
      };
    }

    const commonTypes: Array<OmniType> = [];
    for (let i = 0; i < properties.length; i++) {

      // NOTE: Need good test cases for this, to check that it really finds the lowest equality level
      const current = properties[i];
      if (i == properties.length - 1) {

        // This is the last property. There is no next to compare to.
        //TODO: Problem is from removal of this! We do not get all the possible property types! Need to rethink how we get the common types of all properties so it works for property elevation!
        // possiblePropertyTypes.push(current.type);
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

      if (equalityLevel.commonType) {
        commonTypes.push(equalityLevel.commonType);
      }

      if (equalityLevel.typeDiffs) {
        for (const diff of equalityLevel.typeDiffs) {
          if (!propertyEquality.typeDiffs?.includes(diff)) {
            propertyEquality.typeDiffs?.push(diff);
          }
        }
      }

      if (equalityLevel.propertyDiffs) {
        for (const diff of equalityLevel.propertyDiffs) {
          if (!propertyEquality.propertyDiffs?.includes(diff)) {
            propertyEquality.propertyDiffs?.push(diff);
          }
        }
      }
    }

    const commonType = OmniUtil.getCommonDenominator({features: targetFeatures}, commonTypes);
    if (commonType) {

      // We still want to keep the diffs that we collected.
      // But we also want the common type between the different properties that we have found.
      propertyEquality.typeDiffs = [...propertyEquality.typeDiffs ?? [], ...(commonType.diffs ?? [])];
      propertyEquality.commonType = commonType.type;
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
      return {commonType: a.type};
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
        commonType: commonType.type,
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
        commonType: commonType.type,
      };
    }

    if (a.description !== b.description) {
      return {
        propertyDiffs: [PropertyDifference.META],
        typeDiffs: commonType.diffs,
        commonType: commonType.type,
      };
    }

    return {
      propertyDiffs: [],
      typeDiffs: commonType.diffs,
      commonType: commonType.type,
    };
  }
}
