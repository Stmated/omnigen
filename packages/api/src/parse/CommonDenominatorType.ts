import {TypeDiffKind} from '../equality';
import {OmniType} from './OmniModel';

export type CommonDenominatorType<T = OmniType> = {
  type: T;
  constructedType?: T | undefined;
  diffs?: TypeDiffKind[] | undefined;
}
