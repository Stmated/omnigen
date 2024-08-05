import {PropertyInformation} from './PropertyInformation';

export interface PropertiesInformation {

  byPropertyName: {[key: string]: PropertyInformation};
}
