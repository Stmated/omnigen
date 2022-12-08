
// TODO: Move OmniUtil equality code into here instead, split out the responsibilities

import {TypeDifference} from './TypeDifference.js';
import {PropertyDifference} from './PropertyDifference.js';

export class EqualityFinder {

  public static matchesTypeDiff(needle: TypeDifference, ...any: TypeDifference[]) {

    for (const diff of any) {
      if (needle == diff) {
        return true;
      }

      if (needle == TypeDifference.ISOMORPHIC_TYPE && diff == TypeDifference.FUNDAMENTAL_TYPE) {
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
