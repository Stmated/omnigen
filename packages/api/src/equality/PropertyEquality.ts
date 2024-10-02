import {OmniType} from '../parse';
import {PropertyDifference} from './PropertyDifference';
import {TypeDiffKind} from './TypeDiffKind';

export interface PropertyEquality {
  propertyDiffs?: PropertyDifference[] | undefined,
  typeDiffs?: TypeDiffKind[] | undefined,
  type?: OmniType | undefined;
}
