import {OmniType} from '../parse';
import {PropertyDifference} from './PropertyDifference.ts';
import {TypeDiffKind} from './TypeDiffKind.ts';

export interface PropertyEquality {
  propertyDiffs?: PropertyDifference[] | undefined,
  typeDiffs?: TypeDiffKind[] | undefined,
  type?: OmniType | undefined;
}
