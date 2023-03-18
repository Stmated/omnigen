import {OmniType} from '../parse/index.js';
import {PropertyDifference} from './PropertyDifference.js';
import {TypeDifference} from './TypeDifference.js';

export interface PropertyEquality {
  propertyDiffs?: PropertyDifference[] | undefined,
  typeDiffs?: TypeDifference[] | undefined,
  type?: OmniType | undefined;
}
