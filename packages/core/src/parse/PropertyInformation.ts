import {OmniProperty, OmniType} from './OmniModel';
import {PropertyDifference, TypeDifference} from '../equality';

export interface PropertyInformation {
  propertyName: string;
  properties: OmniProperty[];
  propertyDiffs: PropertyDifference[] | undefined,
  typeDiffs: TypeDifference[] | undefined,
  commonType: OmniType;
  distinctTypes: OmniType[];
}
