import {OMNI_GENERIC_FEATURES, OmniExclusiveUnionType, OmniModelTransformer, OmniModelTransformerArgs, OmniNode, OmniType, OmniUnionType, TargetFeatures} from '@omnigen/api';
import {isDefined, OmniUtil, ProxyReducerOmni2, ProxyReducerArg2} from '@omnigen/core';

/**
 * These are examples of unions that we will simplify/remove.
 * <ul>
 *   <li>`string | string` to `string`</li>
 * </ul>
 */
export class SimplifyUnnecessaryCompositionsModelTransformer implements OmniModelTransformer {

  transformModel(args: OmniModelTransformerArgs): void {

    const lossless = true;
    const features = OMNI_GENERIC_FEATURES; // TODO: Make this use impl like JAVA_FEATURES -- need to move to 2nd pass?

    args.model = ProxyReducerOmni2.builder().reduce(args.model, {}, {
      UNION: (_, r) => {
        const reduced = r.yieldBase();
        const merged = this.maybeReduce(OmniUtil.asWriteable(reduced), r, lossless, features);
        if (merged) {
          r.replace(merged);
        }
      },
      EXCLUSIVE_UNION: (_, r) => {
        const reduced = r.yieldBase();
        const merged = this.maybeReduce(OmniUtil.asWriteable(reduced), r, lossless, features);
        if (merged) {
          r.replace(merged);
        }
      },
      INTERSECTION: (_, r) => {
        const reduced = OmniUtil.asWriteable(r.yieldBase());
        if (reduced && OmniUtil.isUnion(reduced) && reduced.types.length === 1) {
          r.replace(reduced.types[0]);
        }
      },
    });
  }

  private maybeReduce(
    n: OmniType | undefined,
    r: ProxyReducerArg2<OmniNode, OmniUnionType | OmniExclusiveUnionType, 'kind', any, {}, any>,
    lossless: boolean,
    features: TargetFeatures,
  ): OmniType | undefined {

    if (!n || !OmniUtil.isUnion(n)) {
      return undefined;
    }

    const reduced = n.types.map(it => r.reduce(it)).filter(isDefined);
    if (reduced.length === 1) {

      if (OmniUtil.hasMeta(n)) {

        // The composition/owner has meta information. Need to create r new type.
        const target = {...reduced[0]};
        OmniUtil.mergeTypeMeta(n, target, false, false, true);
        return target;

      } else {

        // We can just return the single child.
        return reduced[0];
      }
    }

    const distinctTypes = OmniUtil.getDistinctTypes(reduced, features);
    if (distinctTypes.length == 1) {
      return this.mergeTypes(n, reduced, lossless, features);
    }

    return undefined;
  }

  mergeTypes(original: OmniType, types: OmniType[], lossless: boolean, features: TargetFeatures): OmniType {

    let target = {...types[0]};
    OmniUtil.mergeTypeMeta(original, target, false, false, true);
    OmniUtil.copyName(original, target);

    for (let i = 1; i < types.length; i++) {
      target = OmniUtil.mergeType(types[i], target, features, true, true);
    }

    OmniUtil.copyName(original, target);
    for (let i = 0; i < types.length; i++) {
      OmniUtil.mergeTypeMeta(types[i], target, false, true);
    }

    return target;
  }
}
