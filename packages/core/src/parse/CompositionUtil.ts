import {
  OmniCompositionType,
  OmniType,
  OmniTypeKind,
} from '@omnigen/api';
import {OmniUtil} from './OmniUtil.ts';

export class CompositionUtil {

  /**
   * TODO: This method is a mess and should need some cleanup
   */
  public static getCompositionOrExtensionType(
    compositionsAnyOfOr: OmniType[] = [],
    compositionsAllOfAnd: OmniType[] = [],
    compositionsOneOfOr: OmniType[] = [],
    compositionNot?: OmniType,
  ): OmniType | undefined {

    let composition: OmniType | undefined;

    if (compositionsAnyOfOr.length == 1 && !composition) {
      composition = compositionsAnyOfOr[0];
    } else if (compositionsAnyOfOr.length > 0) {
      const or: OmniType = (compositionsAnyOfOr.length > 1)
        ? <OmniCompositionType>{
          kind: OmniTypeKind.UNION,
          types: compositionsAnyOfOr,
          // inline: compositionsAnyOfOr.every(it => it.inline),
        }
        : compositionsAnyOfOr[0];

      if (!composition) {
        composition = or;
      } else {
        composition = {
          kind: OmniTypeKind.INTERSECTION,
          types: [composition, or],
          // inline: compositionsAnyOfOr.every(it => it.inline),
        } satisfies OmniCompositionType;
      }
    }

    if (compositionsAllOfAnd.length == 1 && !composition) {
      composition = compositionsAllOfAnd[0];
    } else if (compositionsAllOfAnd.length > 0) {
      const and: OmniType = (compositionsAllOfAnd.length > 1)
        ? <OmniCompositionType>{
          kind: OmniTypeKind.INTERSECTION,
          types: compositionsAllOfAnd,
          // inline: compositionsAllOfAnd.every(it => it.inline),
        }
        : compositionsAllOfAnd[0];

      if (!composition) {
        composition = and;
      } else {
        composition = {
          kind: OmniTypeKind.INTERSECTION,
          types: [composition, and],
        } satisfies OmniCompositionType;
      }
    }

    if (compositionsOneOfOr.length == 1 && !composition) {
      composition = compositionsOneOfOr[0];
    } else if (compositionsOneOfOr.length > 1) {
      const xor: OmniType = (compositionsOneOfOr.length > 1)
        ? <OmniCompositionType>{
          kind: OmniTypeKind.EXCLUSIVE_UNION,
          types: compositionsOneOfOr,
          // inline: compositionsOneOfOr.every(it => it.inline),
        }
        : compositionsOneOfOr[0];

      if (!composition) {
        composition = xor;
      } else {
        composition = {
          kind: OmniTypeKind.INTERSECTION,
          types: [composition, xor],
          // inline: compositionsOneOfOr.every(it => it.inline),
        } satisfies OmniCompositionType;
      }
    }

    if (compositionNot) {
      const not: OmniCompositionType = {
        kind: OmniTypeKind.NEGATION,
        types: [compositionNot],
        // inline: compositionNot.inline ?? false,
      };

      if (!composition) {
        composition = not;
      } else {
        composition = {
          kind: OmniTypeKind.INTERSECTION,
          types: [composition, not],
        } satisfies OmniCompositionType;
      }
    }

    return composition;
  }
}
