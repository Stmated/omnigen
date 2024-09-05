import {OmniOwnedProperty, OmniPropertyName, OmniType} from './OmniModel';
import {PropertyDifference, TypeDiffKind} from '../equality';

export interface PropertyInformation {
  propertyName: OmniPropertyName;
  properties: OmniOwnedProperty[];
  propertyDiffs: PropertyDifference[] | undefined,
  typeDiffs: TypeDiffKind[] | undefined,
  commonType: OmniType;
  distinctTypes: OmniType[];
}
