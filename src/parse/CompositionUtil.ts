import {
  CompositionKind,
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
        ? <OmniCompositionType>{
          name: () => compositionsAnyOfOr.map(it => Naming.safer(it)).join('Or'),
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.OR,
          types: compositionsAnyOfOr
        }
        : compositionsAnyOfOr[0];

      if (!composition) {
        composition = or;
      } else {
        const finalType = composition;
        composition = {
          name: () => `${Naming.safer(finalType)}And${Naming.safer(or)}`,
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [composition, or]
        } as OmniCompositionType;
      }
    }

    if (compositionsAllOfAnd.length == 1 && !composition) {
      composition = compositionsAllOfAnd[0];
    } else if (compositionsAllOfAnd.length > 0) {
      const and: OmniType = (compositionsAllOfAnd.length > 1)
        ? <OmniCompositionType>{
          name: () => compositionsAllOfAnd.map(it => Naming.safer(it)).join('And'),
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: compositionsAllOfAnd
        }
        : compositionsAllOfAnd[0];

      if (!composition) {
        composition = and;
      } else {
        const finalType = composition;
        composition = {
          name: () => `${Naming.safer(finalType)}And${Naming.safer(and)}`,
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [composition, and]
        } as OmniCompositionType;
      }
    }

    if (compositionsOneOfOr.length == 1 && !composition) {
      composition = compositionsOneOfOr[0];
    } else if (compositionsOneOfOr.length > 1) {
      const xor: OmniType = (compositionsOneOfOr.length > 1)
        ? <OmniCompositionXORType>{
          name: () => compositionsOneOfOr.map(it => Naming.safer(it)).join('XOr'),
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.XOR,

          mappingPropertyName: '',
          mappings: new Map<string, OmniType>(),

          types: compositionsOneOfOr
        }
        : compositionsOneOfOr[0];

      if (!composition) {
        composition = xor;
      } else {
        const finalType = composition;
        composition = {
          name: () => `${Naming.safer(finalType)}And${Naming.safer(xor)}`,
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [composition, xor]
        } as OmniCompositionType;
      }
    }

    if (compositionNot) {
      const not = {
        name: () => `Not${Naming.unwrap(compositionNot.name)}`,
        kind: OmniTypeKind.COMPOSITION,
        compositionKind: CompositionKind.NOT,
        types: [compositionNot]
      } as OmniCompositionType;

      if (!composition) {
        composition = not;
      } else {
        const finalType = composition;
        composition = {
          name: () => `${Naming.safer(finalType)}And${Naming.unwrap(not.name)}`,
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [composition, not]
        } as OmniCompositionType;
      }
    }

    return composition;
  }
}
