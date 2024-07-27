import {OmniExclusiveUnionType, OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniType, OmniTypeKind, OmniUnionType, TargetFeatures} from '@omnigen/core';
import {OmniUtil} from '@omnigen/core-util';
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

    const replaced = new Map<OmniType, OmniType | null>();

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      if (!ctx.parent) {
        return;
      }

      const alreadyReplaced = replaced.get(ctx.type);
      if (alreadyReplaced) {
        ctx.replacement = alreadyReplaced;
      } else if (ctx.type.kind === OmniTypeKind.UNION || ctx.type.kind === OmniTypeKind.EXCLUSIVE_UNION) {

        const distinctTypes = OmniUtil.getDistinctTypes(ctx.type.types, args.targetFeatures);
        if (distinctTypes.length > 2 && distinctTypes.every(it => it.kind === OmniTypeKind.OBJECT)) {

          const merged = this.mergeTypes(ctx.type, args.targetFeatures);
          // if (!args.model.types.includes(merged)) {
          //   args.model.types.push(merged);
          // }

          ctx.replacement = merged;
          replaced.set(ctx.type, merged);
        }
      }
    });

    for (const replacedType of replaced.keys()) {

      const index = args.model.types.indexOf(replacedType);
      if (index != -1) {
        args.model.types.splice(index, 1);
      }
    }
  }

  private mergeTypes(union: OmniUnionType | OmniExclusiveUnionType, features: TargetFeatures): OmniType {

    const types = union.types;
    let target = {...types[0]};
    OmniUtil.mergeTypeMeta(union, target, false, true);
    OmniUtil.copyName(union, target);

    for (let i = 1; i < types.length; i++) {
      target = OmniUtil.mergeType(types[i], target, features, false, true);
    }

    return target;
  }
}
