import {OmniOwnedProperty, OmniType} from './OmniModel';
import {PropertyDifference, TypeDiffKind} from '../equality';

export interface PropertyInformation {
  propertyName: string;
  properties: OmniOwnedProperty[];
  propertyDiffs: PropertyDifference[] | undefined,
  typeDiffs: TypeDiffKind[] | undefined,
  commonType: OmniType;
  distinctTypes: OmniType[];
}
