import {TypeDiffKind} from '../equality';
import {OmniType} from './OmniModel';

export interface CommonDenominatorType<T = OmniType> {

  type: T;
  diffs?: TypeDiffKind[] | undefined;
  created?: boolean;
}
