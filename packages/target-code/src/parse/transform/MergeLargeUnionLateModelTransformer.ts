import {OmniExclusiveUnionType, OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniTypeKind, OmniUnionType, TargetFeatures} from '@omnigen/api';
import {OmniUtil, ProxyReducerOmni2} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

/**
 * If a union is too large, then some languages might prefer to merge the union into one new type that is less expressive but easier to work with.
 */
export class MergeLargeUnionLateModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs): void {

    if (args.features.unions) {

      // The target language supports unions, so it would be weird to make this lossy conversion.
      return;
    }

    args.model = ProxyReducerOmni2.builder().reduce(args.model, {}, {
      UNION: (_, r) => {
        const reduced = r.yieldBase();
        if (reduced && OmniUtil.isUnion(reduced)) {
          const merged = this.maybeMerged(reduced, args.features);
          if (merged) {
            r.replace(merged);
          }
        }
      },
      EXCLUSIVE_UNION: (_, r) => {
        const reduced = r.yieldBase();
        if (reduced && OmniUtil.isUnion(reduced)) {
          const merged = this.maybeMerged(reduced, args.features);
          if (merged) {
            r.replace(merged);
          }
        }
      },
    });
  }

  private maybeMerged(n: OmniUnionType | OmniExclusiveUnionType, features: TargetFeatures) {

    const types = n.types;
    const distinctTypes = OmniUtil.getDistinctTypes(types, features);
    if (distinctTypes.length > 2 && distinctTypes.every(it => (it.kind === OmniTypeKind.OBJECT))) {

      let target = {...types[0]};
      OmniUtil.mergeTypeMeta(n, target, false, true);
      OmniUtil.copyName(n, target);

      for (let i = 1; i < types.length; i++) {
        target = OmniUtil.mergeType(types[i], target, features, false, true);
      }

      return target;
    }

    return undefined;
  }
}
