import {OmniType} from './OmniModel';
import {EqualityLevel} from './EqualityLevel';

export interface CommonDenominatorType<T extends OmniType> {

  type: T;
  level: EqualityLevel;
}
