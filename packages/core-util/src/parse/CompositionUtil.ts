import {
  CompositionKind,
  OmniCompositionType,
  OmniType,
  OmniTypeKind,
} from '@omnigen/core';

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
        ? <OmniCompositionType<OmniType, CompositionKind>>{
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.OR,
          types: compositionsAnyOfOr,
        }
        : compositionsAnyOfOr[0];

      if (!composition) {
        composition = or;
      } else {
        composition = {
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [composition, or],
        } satisfies OmniCompositionType<OmniType, CompositionKind>;
      }
    }

    if (compositionsAllOfAnd.length == 1 && !composition) {
      composition = compositionsAllOfAnd[0];
    } else if (compositionsAllOfAnd.length > 0) {
      const and: OmniType = (compositionsAllOfAnd.length > 1)
        ? <OmniCompositionType<OmniType, CompositionKind>>{
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: compositionsAllOfAnd,
        }
        : compositionsAllOfAnd[0];

      if (!composition) {
        composition = and;
      } else {
        composition = {
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [composition, and],
        } satisfies OmniCompositionType<OmniType, CompositionKind>;
      }
    }

    if (compositionsOneOfOr.length == 1 && !composition) {
      composition = compositionsOneOfOr[0];
    } else if (compositionsOneOfOr.length > 1) {
      const xor: OmniType = (compositionsOneOfOr.length > 1)
        ? <OmniCompositionType<OmniType, CompositionKind>>{
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.XOR,

          types: compositionsOneOfOr,
        }
        : compositionsOneOfOr[0];

      if (!composition) {
        composition = xor;
      } else {
        composition = {
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [composition, xor],
        } satisfies OmniCompositionType<OmniType, CompositionKind>;
      }
    }

    if (compositionNot) {
      const not: OmniCompositionType<OmniType, CompositionKind> = {
        kind: OmniTypeKind.COMPOSITION,
        compositionKind: CompositionKind.NOT,
        types: [compositionNot],
      };

      if (!composition) {
        composition = not;
      } else {
        composition = {
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [composition, not],
        } satisfies OmniCompositionType<OmniType, CompositionKind>;
      }
    }

    return composition;
  }
}
