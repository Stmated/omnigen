import {OmniProperty, OmniType} from './OmniModel.js';
import {EqualityLevel} from './EqualityLevel.js';

export interface PropertyInformation {
  properties: OmniProperty[];
  propertyEqualityLevel: EqualityLevel;
  typeEqualityLevel: EqualityLevel;
  commonType: OmniType;
  distinctTypes: OmniType[];
}


export interface PropertiesInformation {

  byPropertyName: {[key: string]: PropertyInformation};
}
