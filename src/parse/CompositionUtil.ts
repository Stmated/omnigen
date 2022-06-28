import {
  CompositionKind,
  GenericCompositionType,
  GenericCompositionXORType,
  GenericType,
  GenericTypeKind
} from '@parse/GenericModel';
import {Naming} from '@parse/Naming';

export class CompositionUtil {

  public static getCompositionOrExtensionType(
    compositionsAnyOfOr: GenericType[] = [],
    compositionsAllOfAnd: GenericType[] = [],
    compositionsOneOfOr: GenericType[] = [],
    compositionNot?: GenericType
  ): GenericType | undefined {

    let composition: GenericType | undefined;

    if (compositionsAnyOfOr.length == 1 && !composition) {
      composition = compositionsAnyOfOr[0];
    } else if (compositionsAnyOfOr.length > 0) {
      const or: GenericType = (compositionsAnyOfOr.length > 1)
        ? <GenericCompositionType>{
          name: () => compositionsAnyOfOr.map(it => Naming.safer(it)).join('Or'),
          kind: GenericTypeKind.COMPOSITION,
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
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [composition, or]
        } as GenericCompositionType;
      }
    }

    if (compositionsAllOfAnd.length == 1 && !composition) {
      composition = compositionsAllOfAnd[0];
    } else if (compositionsAllOfAnd.length > 0) {
      const and: GenericType = (compositionsAllOfAnd.length > 1)
        ? <GenericCompositionType>{
          name: () => compositionsAllOfAnd.map(it => Naming.safer(it)).join('And'),
          kind: GenericTypeKind.COMPOSITION,
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
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [composition, and]
        } as GenericCompositionType;
      }
    }

    if (compositionsOneOfOr.length == 1 && !composition) {
      composition = compositionsOneOfOr[0];
    } else if (compositionsOneOfOr.length > 1) {
      const xor: GenericType = (compositionsOneOfOr.length > 1)
        ? <GenericCompositionXORType>{
          name: () => compositionsOneOfOr.map(it => Naming.safer(it)).join('XOr'),
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.XOR,

          mappingPropertyName: '',
          mappings: new Map<string, GenericType>(),

          types: compositionsOneOfOr
        }
        : compositionsOneOfOr[0];

      if (!composition) {
        composition = xor;
      } else {
        const finalType = composition;
        composition = {
          name: () => `${Naming.safer(finalType)}And${Naming.safer(xor)}`,
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [composition, xor]
        } as GenericCompositionType;
      }
    }

    if (compositionNot) {
      const not = {
        name: () => `Not${Naming.unwrap(compositionNot.name)}`,
        kind: GenericTypeKind.COMPOSITION,
        compositionKind: CompositionKind.NOT,
        types: [compositionNot]
      } as GenericCompositionType;

      if (!composition) {
        composition = not;
      } else {
        const finalType = composition;
        composition = {
          name: () => `${Naming.safer(finalType)}And${Naming.unwrap(not.name)}`,
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [composition, not]
        } as GenericCompositionType;
      }
    }

    return composition;
  }
}
