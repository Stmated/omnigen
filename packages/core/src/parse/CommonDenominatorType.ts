import {TypeDifference} from '../equality';

export interface CommonDenominatorType<T> {

  type: T;
  diffs?: TypeDifference[] | undefined;
}
