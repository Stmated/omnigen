import {
  CompositionKind,
  OmniCompositionORType,
  OmniCompositionType,
  OmniCompositionXORType,
  OmniType,
  OmniTypeKind
} from '@parse/OmniModel';

export class CompositionUtil {

  public static getCompositionOrExtensionType(
    compositionsAnyOfOr: OmniType[] = [],
    compositionsAllOfAnd: OmniType[] = [],
    compositionsOneOfOr: OmniType[] = [],
    compositionNot?: OmniType
  ): OmniType | undefined {

    let composition: OmniType | undefined;

    if (compositionsAnyOfOr.length == 1 && !composition) {
      composition = compositionsAnyOfOr[0];
    } else if (compositionsAnyOfOr.length > 0) {
      const or: OmniType = (compositionsAnyOfOr.length > 1)
        ? <OmniCompositionORType>{
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.OR,
          orTypes: compositionsAnyOfOr
        }
        : compositionsAnyOfOr[0];

      if (!composition) {
        composition = or;
      } else {
        const compositionType: OmniCompositionType = {
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          andTypes: [composition, or]
        };
        composition = compositionType;
      }
    }

    if (compositionsAllOfAnd.length == 1 && !composition) {
      composition = compositionsAllOfAnd[0];
    } else if (compositionsAllOfAnd.length > 0) {
      const and: OmniType = (compositionsAllOfAnd.length > 1)
        ? <OmniCompositionType>{
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          andTypes: compositionsAllOfAnd
        }
        : compositionsAllOfAnd[0];

      if (!composition) {
        composition = and;
      } else {
        composition = {
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          andTypes: [composition, and]
        } as OmniCompositionType;
      }
    }

    if (compositionsOneOfOr.length == 1 && !composition) {
      composition = compositionsOneOfOr[0];
    } else if (compositionsOneOfOr.length > 1) {
      const xor: OmniType = (compositionsOneOfOr.length > 1)
        ? <OmniCompositionXORType>{
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.XOR,

          xorTypes: compositionsOneOfOr
        }
        : compositionsOneOfOr[0];

      if (!composition) {
        composition = xor;
      } else {
        composition = {
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          andTypes: [composition, xor]
        } as OmniCompositionType;
      }
    }

    if (compositionNot) {
      const not: OmniCompositionType = {
        kind: OmniTypeKind.COMPOSITION,
        compositionKind: CompositionKind.NOT,
        notTypes: [compositionNot]
      };

      if (!composition) {
        composition = not;
      } else {
        composition = {
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          andTypes: [composition, not]
        } as OmniCompositionType;
      }
    }

    return composition;
  }
}
