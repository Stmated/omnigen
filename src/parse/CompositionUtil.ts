import {CompositionKind, GenericCompositionType, GenericType, GenericTypeKind} from '@parse/GenericModel';
import {Naming} from '@parse/Naming';

export class CompositionUtil {

  public static getCompositionType(
    compositionsAnyOfOr: GenericType[] = [],
    compositionsAllOfAnd: GenericType[] = [],
    compositionsOneOfOr: GenericType[] = [],
    compositionNot?: GenericType
  ): GenericType | undefined {

    let extensionType: GenericType | undefined;

    if (compositionsAnyOfOr.length == 1 && !extensionType) {
      extensionType = compositionsAnyOfOr[0];
    } else if (compositionsAnyOfOr.length > 0) {
      const or: GenericType = (compositionsAnyOfOr.length > 1)
        ? <GenericCompositionType>{
          name: () => compositionsAnyOfOr.map(it => Naming.safer(it)).join('Or'),
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.OR,
          types: compositionsAnyOfOr
        }
        : compositionsAnyOfOr[0];

      if (!extensionType) {
        extensionType = or;
      } else {
        const finalType = extensionType;
        extensionType = {
          name: () => `${Naming.safer(finalType)}And${Naming.safer(or)}`,
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [extensionType, or]
        } as GenericCompositionType;
      }
    }

    if (compositionsAllOfAnd.length == 1 && !extensionType) {
      extensionType = compositionsAllOfAnd[0];
    } else if (compositionsAllOfAnd.length > 0) {
      const and: GenericType = (compositionsAllOfAnd.length > 1)
        ? <GenericCompositionType>{
          name: () => compositionsAllOfAnd.map(it => Naming.safer(it)).join('And'),
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: compositionsAllOfAnd
        }
        : compositionsAllOfAnd[0];

      if (!extensionType) {
        extensionType = and;
      } else {
        const finalType = extensionType;
        extensionType = {
          name: () => `${Naming.safer(finalType)}And${Naming.safer(and)}`,
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [extensionType, and]
        } as GenericCompositionType;
      }
    }

    if (compositionsOneOfOr.length == 1 && !extensionType) {
      extensionType = compositionsOneOfOr[0];
    } else if (compositionsOneOfOr.length > 1) {
      const xor: GenericType = (compositionsOneOfOr.length > 1)
        ? <GenericCompositionType>{
          name: () => compositionsOneOfOr.map(it => Naming.safer(it)).join('XOr'),
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.XOR,
          types: compositionsOneOfOr
        }
        : compositionsOneOfOr[0];

      if (!extensionType) {
        extensionType = xor;
      } else {
        const finalType = extensionType;
        extensionType = {
          name: () => `${Naming.safer(finalType)}And${Naming.safer(xor)}`,
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [extensionType, xor]
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

      if (!extensionType) {
        extensionType = not;
      } else {
        const finalType = extensionType;
        extensionType = {
          name: () => `${Naming.safer(finalType)}And${Naming.unwrap(not.name)}`,
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [extensionType, not]
        } as GenericCompositionType;
      }
    }

    return extensionType;
  }
}
