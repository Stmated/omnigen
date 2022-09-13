import {
  CompositionKind,
  OmniCompositionORType,
  OmniCompositionType,
  OmniCompositionXORType,
  OmniType,
  OmniTypeKind
} from '@parse/OmniModel';
import {Naming} from '@parse/Naming';

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
          name: (fn) => compositionsAnyOfOr.map(it => Naming.safer(it, fn)).join('Or'),
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.OR,
          orTypes: compositionsAnyOfOr
        }
        : compositionsAnyOfOr[0];

      if (!composition) {
        composition = or;
      } else {
        const finalType = composition;
        composition = {
          name: (fn) => `${Naming.safer(finalType, fn)}And${Naming.safer(or, fn)}`,
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          andTypes: [composition, or]
        } as OmniCompositionType;
      }
    }

    if (compositionsAllOfAnd.length == 1 && !composition) {
      composition = compositionsAllOfAnd[0];
    } else if (compositionsAllOfAnd.length > 0) {
      const and: OmniType = (compositionsAllOfAnd.length > 1)
        ? <OmniCompositionType>{
          name: (fn) => compositionsAllOfAnd.map(it => Naming.safer(it, fn)).join('And'),
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          andTypes: compositionsAllOfAnd
        }
        : compositionsAllOfAnd[0];

      if (!composition) {
        composition = and;
      } else {
        const finalType = composition;
        composition = {
          name: (fn) => `${Naming.safer(finalType, fn)}And${Naming.safer(and, fn)}`,
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
          name: (duplicateFn) => compositionsOneOfOr.map(it => Naming.safer(it, duplicateFn)).join('XOr'),
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.XOR,

          xorTypes: compositionsOneOfOr
        }
        : compositionsOneOfOr[0];

      if (!composition) {
        composition = xor;
      } else {
        const finalType = composition;
        composition = {
          name: (fn) => `${Naming.safer(finalType, fn)}And${Naming.safer(xor, fn)}`,
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          andTypes: [composition, xor]
        } as OmniCompositionType;
      }
    }

    if (compositionNot) {
      const not = {
        name: (fn) => `Not${Naming.safer(compositionNot, fn)}`,
        kind: OmniTypeKind.COMPOSITION,
        compositionKind: CompositionKind.NOT,
        notTypes: [compositionNot]
      } as OmniCompositionType;

      if (!composition) {
        composition = not;
      } else {
        const finalType = composition;
        composition = {
          name: (fn) => `${Naming.safer(finalType)}And${Naming.safer(not, fn)}`,
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          andTypes: [composition, not]
        } as OmniCompositionType;
      }
    }

    return composition;
  }
}
