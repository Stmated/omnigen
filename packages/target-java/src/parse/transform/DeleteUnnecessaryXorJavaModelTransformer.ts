import {CompositionKind, OmniModelTransformer, OmniModelTransformerArgs, OmniType, OmniTypeKind, ParserOptions} from '@omnigen/core';
import {OmniUtil} from '@omnigen/core-util';
import {JAVA_FEATURES} from '../..';

/**
 * Java cannot represent XOR/union types without wrapping inside an object to handle those situations.
 *
 * But if we have an XOR that is for example `string | string` then we can just normalize it into `string` (and also moving names/descriptions)
 */
export class DeleteUnnecessaryXorJavaModelTransformer implements OmniModelTransformer {

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
        // OmniUtil.swapType(ctx.owner, ctx.type, alreadyReplaced);
      } else if (ctx.type.kind == OmniTypeKind.COMPOSITION && ctx.type.compositionKind == CompositionKind.XOR) {

        const distinctTypes = OmniUtil.getDistinctTypes(ctx.type.types, JAVA_FEATURES);
        if (distinctTypes.length == 1) {

          const merged = this.mergeTypes(ctx.type, ctx.type.types, lossless);
          // OmniUtil.swapType(ctx.owner, ctx.type, merged);
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
