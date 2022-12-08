import {TypeDifference} from '../equality/index.js';

export interface CommonDenominatorType<T> {

  type: T;
  diffs?: TypeDifference[] | undefined;
}
