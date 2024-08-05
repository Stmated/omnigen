import {OMNI_GENERIC_FEATURES, OmniExclusiveUnionType, OmniModelTransformer, OmniModelTransformerArgs, OmniNode, OmniType, OmniUnionType, TargetFeatures} from '@omnigen/api';
import {OmniReducer, isDefined, OmniUtil, ReducerArgs, ReturnTypeOverride} from '@omnigen/core';

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

    const reducer = new OmniReducer({
      UNION: (n, a) => this.maybeReduce(n, a, lossless, features) ?? a.base.UNION(n, a),
      EXCLUSIVE_UNION: (n, a) => this.maybeReduce(n, a, lossless, features) ?? a.base.EXCLUSIVE_UNION(n, a),
      INTERSECTION: (n, a) => (n.types.length === 1) ? a.dispatcher.reduce(n.types[0]) : a.base.INTERSECTION(n, a),
    });

    args.model = reducer.reduce(args.model);
  }

  maybeReduce(n: OmniUnionType | OmniExclusiveUnionType, a: ReducerArgs<OmniNode, 'kind', ReturnTypeOverride>, lossless: boolean, features: TargetFeatures): OmniType | undefined {

    const reduced = n.types.map(it => a.dispatcher.reduce(it)).filter(isDefined);
    if (reduced.length === 1) {

      if (OmniUtil.hasMeta(n)) {

        // The composition/owner has meta information. Need to create a new type.
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
