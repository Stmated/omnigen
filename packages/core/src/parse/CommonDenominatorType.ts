import {TypeDiffKind} from '../equality';

export interface CommonDenominatorType<T> {

  type: T;
  diffs?: TypeDiffKind[] | undefined;
}
