import {OmniExclusiveUnionType, OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniTypeKind, OmniUnionType, TargetFeatures} from '@omnigen/api';
import {DefaultOmniReducerArgs, OmniReducer, isDefined, OmniUtil} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

/**
 * If a union is too large, then some languages might prefer to merge the union into one new type that is less expressive but easier to work with.
 */
export class MergeLargeUnionLateModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs): void {

    if (args.targetFeatures.unions) {

      // The target language supports unions, so it would be weird to make this lossy conversion.
      return;
    }

    const reducer = new OmniReducer({
      UNION: (n, a) => this.maybeReduce(n, a, args.targetFeatures),
      EXCLUSIVE_UNION: (n, a) => this.maybeReduce(n, a, args.targetFeatures),
    });

    args.model = reducer.reduce(args.model);
  }

  private maybeReduce(n: OmniUnionType | OmniExclusiveUnionType, a: DefaultOmniReducerArgs, features: TargetFeatures) {

    const reduced = n.types.map(it => a.dispatcher.reduce(it)).filter(isDefined);
    const distinctTypes = OmniUtil.getDistinctTypes(reduced, features);
    if (distinctTypes.length > 2 && distinctTypes.every(it => (it.kind === OmniTypeKind.OBJECT))) {

      const types = n.types;
      let target = {...types[0]};
      OmniUtil.mergeTypeMeta(n, target, false, true);
      OmniUtil.copyName(n, target);

      for (let i = 1; i < types.length; i++) {
        target = OmniUtil.mergeType(types[i], target, features, false, true);
      }

      return target;
    }

    return {...n, types: reduced};
  }
}
