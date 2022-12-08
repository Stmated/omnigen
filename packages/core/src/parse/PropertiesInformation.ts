import {OmniProperty, OmniType} from './OmniModel.js';
import {PropertyDifference, TypeDifference} from '../equality/index.js';

export interface PropertyInformation {
  properties: OmniProperty[];
  // equality: EqualityGrades;
  // typeEqualityLevel: EqualityLevel;
  propertyDiffs: PropertyDifference[] | undefined,
  typeDiffs: TypeDifference[] | undefined,
  commonType: OmniType;
  distinctTypes: OmniType[];
}


export interface PropertiesInformation {

  byPropertyName: {[key: string]: PropertyInformation};
}
