import {OmniType} from '../parse';
import {PropertyDifference} from './PropertyDifference';
import {TypeDiffKind} from './TypeDiffKind';
import {StrictReadonly} from '../util';

export interface PropertyEquality {
  propertyDiffs?: PropertyDifference[] | undefined,
  typeDiffs?: TypeDiffKind[] | undefined,
  type?: StrictReadonly<OmniType> | undefined;
}
