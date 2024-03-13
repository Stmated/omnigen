import {OmniType} from '../parse';
import {PropertyDifference} from './PropertyDifference.ts';
import {TypeDifference} from './TypeDifference.ts';

export interface PropertyEquality {
  propertyDiffs?: PropertyDifference[] | undefined,
  typeDiffs?: TypeDifference[] | undefined,
  type?: OmniType | undefined;
}
