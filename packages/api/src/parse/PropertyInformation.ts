import {OmniProperty, OmniType} from './OmniModel';
import {PropertyDifference, TypeDiffKind} from '../equality';

export interface PropertyInformation {
  propertyName: string;
  properties: OmniProperty[];
  propertyDiffs: PropertyDifference[] | undefined,
  typeDiffs: TypeDiffKind[] | undefined,
  commonType: OmniType;
  distinctTypes: OmniType[];
}
