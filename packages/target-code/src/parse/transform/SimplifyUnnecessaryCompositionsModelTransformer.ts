import {OMNI_GENERIC_FEATURES, OmniModelTransformer, OmniModelTransformerArgs, OmniType, OmniTypeKind, ParserOptions, TargetFeatures} from '@omnigen/core';
import {OmniUtil} from '@omnigen/core-util';

/**
 * These are examples of unions that we will simplify/remove.
 * <ul>
 *   <li>`string | string` to `string`</li>
 * </ul>
 */
export class SimplifyUnnecessaryCompositionsModelTransformer implements OmniModelTransformer {

  transformModel(args: OmniModelTransformerArgs<ParserOptions>): void {

    const lossless = true;
    const replaced = new Map<OmniType, OmniType | null>();

    const features = OMNI_GENERIC_FEATURES; // TODO: Make this use impl like JAVA_FEATURES -- need to move to 2nd pass?

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      if (!ctx.parent) {
        return;
      }

      const alreadyReplaced = replaced.get(ctx.type);
      if (alreadyReplaced) {
        ctx.replacement = alreadyReplaced;
      } else if (ctx.type.kind === OmniTypeKind.EXCLUSIVE_UNION || ctx.type.kind === OmniTypeKind.UNION) {

        const distinctTypes = OmniUtil.getDistinctTypes(ctx.type.types, features);
        if (distinctTypes.length == 1) {

          const merged = this.mergeTypes(ctx.type, ctx.type.types, lossless, features);
          ctx.replacement = merged;
          replaced.set(ctx.type, merged);
        }
      } else if (ctx.type.kind === OmniTypeKind.INTERSECTION && ctx.type.types.length == 1) {
        OmniUtil.swapType(args.model, ctx.type, ctx.type.types[0], 10);
      }
    });

    for (const replacedType of replaced.keys()) {

      const index = args.model.types.indexOf(replacedType);
      if (index != -1) {
        args.model.types.splice(index, 1);
      }
    }
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
