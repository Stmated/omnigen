import {OmniOwnedProperty, OmniPropertyName, OmniType} from './OmniModel';
import {PropertyDifference, TypeDiffKind} from '../equality';
import {StrictReadonly} from '../util';

export interface PropertyInformation {
  propertyName: OmniPropertyName;
  properties: OmniOwnedProperty[];
  propertyDiffs: PropertyDifference[] | undefined,
  typeDiffs: TypeDiffKind[] | undefined,
  commonType: StrictReadonly<OmniType>;
  distinctTypes: OmniType[];
}
