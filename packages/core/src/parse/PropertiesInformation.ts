import {OmniProperty, OmniType} from './OmniModel';
import {EqualityLevel} from './EqualityLevel';

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
