
// TODO: Move OmniUtil equality code into here instead, split out the responsibilities
import {PropertyDifference, TypeDiffKind} from '@omnigen/api';

export class EqualityFinder {

  public static matchesTypeDiff(needle: TypeDiffKind, ...any: TypeDiffKind[]) {

    for (const diff of any) {
      if (needle == diff) {
        return true;
      }

      if (needle == TypeDiffKind.ISOMORPHIC_TYPE && diff == TypeDiffKind.FUNDAMENTAL_TYPE) {
        return true;
      }
    }

    return false;
  }

  public static matchesPropDiff(needle: PropertyDifference, ...any: PropertyDifference[]) {

    for (const diff of any) {
      if (needle == diff) {
        return true;
      }

      if (diff == PropertyDifference.SIGNATURE) {
        if (needle == PropertyDifference.NAME) {
          return true;
        } else if (needle == PropertyDifference.TYPE) {
          return true;
        }
      }
    }

    return false;
  }
}
