import {CompositionKind, GenericCompositionType, GenericType, GenericTypeKind} from '@parse/GenericModel';
import {NamingUtil} from '@parse/NamingUtil';

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
          name: compositionsAnyOfOr.map(it => NamingUtil.getSafeTypeName(it.name, it.nameClassifier)).join('Or'),
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.OR,
          types: compositionsAnyOfOr
        }
        : compositionsAnyOfOr[0];

      if (!extensionType) {
        extensionType = or;
      } else {
        extensionType = {
          name: `${NamingUtil.getSafeTypeName(extensionType.name, extensionType.nameClassifier)}And${NamingUtil.getSafeTypeName(or.name)}`,
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
          name: compositionsAllOfAnd.map(it => NamingUtil.getSafeTypeName(it.name, it.nameClassifier)).join('And'),
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: compositionsAllOfAnd
        }
        : compositionsAllOfAnd[0];

      if (!extensionType) {
        extensionType = and;
      } else {
        extensionType = {
          name: `${NamingUtil.getSafeTypeName(extensionType.name, extensionType.nameClassifier)}And${NamingUtil.getSafeTypeName(and.name)}`,
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
          name: compositionsOneOfOr.map(it => NamingUtil.getSafeTypeName(it.name, it.nameClassifier)).join('XOr'),
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.XOR,
          types: compositionsOneOfOr
        }
        : compositionsOneOfOr[0];

      if (!extensionType) {
        extensionType = xor;
      } else {
        extensionType = {
          name: `${NamingUtil.getSafeTypeName(extensionType.name, extensionType.nameClassifier)}And${NamingUtil.getSafeTypeName(xor.name)}`,
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [extensionType, xor]
        } as GenericCompositionType;
      }
    }

    if (compositionNot) {
      const not = {
        name: `Not${compositionNot.name}`,
        kind: GenericTypeKind.COMPOSITION,
        compositionKind: CompositionKind.NOT,
        types: [compositionNot]
      } as GenericCompositionType;

      if (!extensionType) {
        extensionType = not;
      } else {
        extensionType = {
          name: `${NamingUtil.getSafeTypeName(extensionType.name, extensionType.nameClassifier)}And${not.name}`,
          kind: GenericTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [extensionType, not]
        } as GenericCompositionType;
      }
    }

    return extensionType;
  }
}
