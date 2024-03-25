import {TypeDiffKind} from '../equality';
import {OmniType} from './OmniModel.ts';

export interface CommonDenominatorType<T = OmniType> {

  type: T;
  diffs?: TypeDiffKind[] | undefined;
}
