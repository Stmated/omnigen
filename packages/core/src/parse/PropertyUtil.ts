import {OmniProperty, OmniPropertyOrphan, OmniPropertyOwner, OmniType, OmniTypeKind} from './OmniModel.js';
import {PropertiesInformation} from './PropertiesInformation.js';
import {OmniUtil} from './OmniUtil.js';
import {EqualityLevel, PropertyEquality} from './EqualityLevel.js';

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

  public static getCommonProperties(
    minPropertyEquality: EqualityLevel,
    minTypeEquality: EqualityLevel,
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
        minTypeEquality,
        minPropertyEquality,
      );

      if (propertyEquality) {

        const distinctTypes: OmniType[] = [];
        for (const property of commonPropertiesWithSameName) {

          const sameType = distinctTypes.find(it => {
            const common = OmniUtil.getCommonDenominatorBetween(property.type, it, false);
            return common?.level && common?.level >= EqualityLevel.CLONE_MIN;
          });

          if (!sameType) {
            distinctTypes.push(property.type);
          }
        }

        information.byPropertyName[propertyName] = {
          properties: commonPropertiesWithSameName,
          propertyEqualityLevel: propertyEquality.propertyEquality,
          typeEqualityLevel: propertyEquality.typeEquality,
          commonType: propertyEquality.type || {kind: OmniTypeKind.UNKNOWN},
          distinctTypes: distinctTypes,
        };
      }
    }

    return information;
  }

  private static getLowestAllowedPropertyEquality(
    properties: OmniProperty[],
    minTypeEquality: EqualityLevel,
    minPropertyEquality: EqualityLevel,
  ): PropertyEquality | undefined {

    const propertyEquality: PropertyEquality = {
      typeEquality: EqualityLevel.IDENTITY_MAX,
      propertyEquality: EqualityLevel.IDENTITY_MAX,
      type: undefined,
    };

    if (properties.length == 1) {

      propertyEquality.type = properties[0].type;
      return propertyEquality;
    }

    for (let i = 1; i < properties.length; i++) {

      // NOTE: Need good test cases for this, to check that it really finds the lowest equality level
      const previous = properties[i - 1];
      const current = properties[i];

      const equalityLevel = PropertyUtil.getEqualityLevel(previous, current);

      if (equalityLevel.typeEquality < propertyEquality.typeEquality) {
        propertyEquality.typeEquality = equalityLevel.typeEquality;

        if (propertyEquality.typeEquality < minTypeEquality) {
          return undefined;
        }
      }

      if (equalityLevel.propertyEquality < propertyEquality.propertyEquality) {
        propertyEquality.propertyEquality = equalityLevel.propertyEquality;
        propertyEquality.type = equalityLevel.type;

        if (propertyEquality.propertyEquality < minPropertyEquality) {
          return undefined;
        }
      }
    }

    return propertyEquality;
  }

  public static getEqualityLevel(a: OmniProperty, b: OmniProperty): PropertyEquality {

    if (a == b) {
      return {propertyEquality: EqualityLevel.IDENTITY_MAX, typeEquality: EqualityLevel.IDENTITY_MAX, type: a.type};
    }

    const aName = a.name;
    const bName = b.name;
    if (aName !== bName) {
      return {propertyEquality: EqualityLevel.NOT_EQUAL_MIN, typeEquality: EqualityLevel.NOT_EQUAL_MIN};
    }

    let commonType = OmniUtil.getCommonDenominatorBetween(a.type, b.type, false);
    if (!commonType) {

      // If no common type was found, we will set the type to UNKNOWN, and level to NOT_EQUAL.
      // The caller might still want to know how good a match the property is, and actually use the type as unknown.
      commonType = {type: {kind: OmniTypeKind.UNKNOWN}, level: EqualityLevel.NOT_EQUAL_MIN};
    }

    if (a.type.kind == OmniTypeKind.PRIMITIVE && b.type.kind == OmniTypeKind.PRIMITIVE) {

      if (a.type.value != b.type.value || a.type.valueMode != b.type.valueMode) {
        return {
          propertyEquality: EqualityLevel.SEMANTICS_MIN,
          typeEquality: commonType.level,
          type: commonType.type,
        };
      }
    }

    if (a.required != b.required) {
      return {
        propertyEquality: EqualityLevel.ISOMORPHIC_MIN,
        typeEquality: commonType.level,
        type: commonType.type,
      };
    }

    if (((a.propertyName || b.propertyName) && a.propertyName != b.propertyName)
      || ((a.fieldName || b.fieldName) && a.fieldName != b.fieldName)) {
      return {
        propertyEquality: EqualityLevel.SEMANTICS_MAX,
        typeEquality: commonType.level,
        type: commonType.type,
      };
    }

    if (a.description !== b.description) {
      return {
        propertyEquality: EqualityLevel.FUNCTION_MAX,
        typeEquality: commonType.level,
        type: commonType.type,
      };
    }

    return {
      propertyEquality: EqualityLevel.CLONE_MAX,
      typeEquality: commonType.level,
      type: commonType.type,
    };
  }
}
