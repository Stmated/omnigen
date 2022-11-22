import {OmniType} from './OmniModel.js';
import {EqualityLevel} from './EqualityLevel.js';

export interface CommonDenominatorType<T extends OmniType> {

  type: T;
  level: EqualityLevel;
}
