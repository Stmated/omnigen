import {OMNI_GENERIC_FEATURES, OmniModelTransformer, OmniModelTransformerArgs, OmniType, OmniTypeKind, ParserOptions} from '@omnigen/core';
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

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      if (!ctx.parent) {
        return;
      }

      const alreadyReplaced = replaced.get(ctx.type);
      if (alreadyReplaced) {
        ctx.replacement = alreadyReplaced;
      } else if (ctx.type.kind == OmniTypeKind.EXCLUSIVE_UNION || ctx.type.kind == OmniTypeKind.UNION) {

        const distinctTypes = OmniUtil.getDistinctTypes(ctx.type.types, OMNI_GENERIC_FEATURES); // TODO: Make this use impl like JAVA_FEATURES -- need to move to 2nd pass?
        if (distinctTypes.length == 1) {

          const merged = this.mergeTypes(ctx.type, ctx.type.types, lossless);
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

  mergeTypes(original: OmniType, types: OmniType[], lossless: boolean): OmniType {

    if (types.length == 0) {
      throw new Error(`Given empty type array`);
    }

    let target = {...types[0]};
    OmniUtil.mergeTypeMeta(original, target, lossless, true);

    if ('name' in target && 'name' in original) {
      target.name = original.name;
    }

    for (let i = 1; i < types.length; i++) {
      target = OmniUtil.mergeType(types[i], target, true, true);
    }

    return target;
  }
}
