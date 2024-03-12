import {
  OmniProperty,
  OmniPropertyOrphan,
  OmniPropertyOwner,
  OmniType,
  OmniTypeKind,
  PropertiesInformation,
} from '@omnigen/core';
import {OmniUtil} from './OmniUtil.js';
import {TargetFeatures} from '@omnigen/core';
import {PropertyDifference, PropertyEquality, TypeDifference} from '@omnigen/core';

type NonNullableProperties<T> = { [P in keyof T]-?: NonNullable<T[P]>; };

export class PropertyUtil {

  public static addProperty(owner: OmniPropertyOwner, property: OmniPropertyOrphan): OmniProperty {

    let propertyWithOwner: OmniProperty;
    if (property.owner) {
      propertyWithOwner = property as OmniProperty;
    } else {
      propertyWithOwner = {
        ...property,
        owner: owner,
      };
    }

    owner.properties.push(propertyWithOwner);

    return propertyWithOwner;
  }

  public static isDisqualifyingPropertyDiff(diffs: PropertyDifference[] | undefined): boolean {

    if (diffs) {
      for (const diff of diffs) {
        if (diff === PropertyDifference.NAME) {
          return true;
        }
      }
    }

    return false;
  }

  public static isDiffMatch(diffs: PropertyDifference[] | undefined, ...needles: PropertyDifference[]): boolean {

    if (diffs) {
      for (const needle of needles) {
        if (diffs.includes(needle)) {
          return true;
        }

        if (needle == PropertyDifference.SIGNATURE) {
          if (diffs.includes(PropertyDifference.TYPE)
            || diffs.includes(PropertyDifference.NAME)
            || diffs.includes(PropertyDifference.META)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  public static getPropertyDiffScore(diff?: PropertyDifference): number {

    if (diff === PropertyDifference.NAME) {
      return 10;
    } else if (diff === PropertyDifference.FIELD_NAME) {
      return 9;
    } else if (diff === PropertyDifference.TYPE) {
      return 8;
    } else if (diff === PropertyDifference.SIGNATURE) {
      return 7;
    } else if (diff === PropertyDifference.REQUIRED) {
      return 6;
    } else if (diff === PropertyDifference.META) {
      return 5;
    }

    return 0;
  }

  public static getCommonProperties(
    bannedTypeDiff: (diff: TypeDifference) => boolean,
    bannedPropDiff: (diff: PropertyDifference) => boolean,
    targetFeatures: TargetFeatures,
    ...types: OmniType[]
  ): PropertiesInformation {

    let commonPropertyNames: string[] | undefined = undefined;
    const propertiesPerType = types.map(t => OmniUtil.getPropertiesOf(t));
    for (const properties of propertiesPerType) {

      const propertyNames = properties.map(p => p.name);
      if (commonPropertyNames == undefined) {
        commonPropertyNames = propertyNames;
      } else {
        commonPropertyNames = commonPropertyNames.filter(name => propertyNames.includes(name));
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

      const commonPropertiesWithSameName = propertiesPerType.flatMap(
        perType => perType.filter(p => (p.name == propertyName)),
      );

      const propertyEquality = this.getLowestAllowedPropertyEquality(
        commonPropertiesWithSameName,
        bannedTypeDiff,
        bannedPropDiff,
        targetFeatures,
      );

      if (propertyEquality) {

        const distinctTypes = OmniUtil.getDistinctTypes(
          commonPropertiesWithSameName.map(it => it.type),
          targetFeatures,
        );

        information.byPropertyName[propertyName] = {
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
    bannedTypeDiff: (diff: TypeDifference) => boolean,
    bannedPropDiff: (diff: PropertyDifference) => boolean,
    targetFeatures: TargetFeatures,
  ): PropertyEquality | undefined {

    const propertyEquality: NonNullableProperties<PropertyEquality> = {
      typeDiffs: [],
      propertyDiffs: [],
      type: {kind: OmniTypeKind.UNKNOWN},
    };

    if (properties.length == 1) {

      propertyEquality.type = properties[0].type;
      return propertyEquality;
    }

    const possiblePropertyTypes: OmniType[] = [];
    for (let i = 0; i < properties.length; i++) {

      // NOTE: Need good test cases for this, to check that it really finds the lowest equality level
      const current = properties[i];
      if (i == properties.length - 1) {

        // This is the last property. There is no next to compare to.
        possiblePropertyTypes.push(current.type);
        continue;
      }

      const next = properties[i + 1];

      const equalityLevel = PropertyUtil.getPropertyEquality(current, next, targetFeatures);

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
        propertyEquality.typeDiffs.push(...equalityLevel.typeDiffs);
      }

      if (equalityLevel.propertyDiffs) {
        propertyEquality.propertyDiffs.push(...equalityLevel.propertyDiffs);
      }
    }

    const commonType = OmniUtil.getCommonDenominator(targetFeatures, ...possiblePropertyTypes);
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
  ): PropertyEquality {

    if (a == b) {
      return {type: a.type};
    }

    const aName = a.name;
    const bName = b.name;
    if (aName !== bName) {
      return {propertyDiffs: [PropertyDifference.NAME]};
    }

    let commonType = OmniUtil.getCommonDenominatorBetween(a.type, b.type, targetFeatures, false);
    if (!commonType) {

      // If no common type was found, we will set the type to UNKNOWN, and level to NOT_EQUAL.
      // The caller might still want to know how good a match the property is, and actually use the type as unknown.
      commonType = {type: {kind: OmniTypeKind.UNKNOWN}, diffs: [TypeDifference.FUNDAMENTAL_TYPE]};
    }

    if (a.required != b.required) {
      return {
        propertyDiffs: [PropertyDifference.REQUIRED],
        typeDiffs: commonType.diffs,
        type: commonType.type,
      };
    }

    if (((a.propertyName || b.propertyName) && a.propertyName != b.propertyName)
      || ((a.fieldName || b.fieldName) && a.fieldName != b.fieldName)) {
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
