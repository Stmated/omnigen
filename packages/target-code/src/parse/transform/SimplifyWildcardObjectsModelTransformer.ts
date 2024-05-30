import {OMNI_GENERIC_FEATURES, OmniModelTransformer, OmniModelTransformerArgs, OmniObjectType, OmniType, OmniTypeKind, OmniUnknownType, ParserOptions, UnknownKind} from '@omnigen/core';
import {OmniUtil} from '@omnigen/core-util';

/**
 * If an object has no properties but has pattern properties that match anything and has any type, then it can be replaced with an `unknown` type.
 */
export class SimplifyWildcardObjectsModelTransformer implements OmniModelTransformer {

  transformModel(args: OmniModelTransformerArgs<ParserOptions>): void {

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      if (ctx.type.kind === OmniTypeKind.OBJECT && this.isEmptyOrSinglePatternProperty(ctx.type)) {

        ctx.replacement = {
          kind: OmniTypeKind.UNKNOWN,
          unknownKind: UnknownKind.OBJECT,
        } satisfies OmniUnknownType;
        // return;
      }

      // const alreadyReplaced = replaced.get(ctx.type);
      // if (alreadyReplaced) {
      //   ctx.replacement = alreadyReplaced;
      // } else if (ctx.type.kind == OmniTypeKind.EXCLUSIVE_UNION || ctx.type.kind == OmniTypeKind.UNION) {
      //
      //   const distinctTypes = OmniUtil.getDistinctTypes(ctx.type.types, OMNI_GENERIC_FEATURES); // TODO: Make this use impl like JAVA_FEATURES -- need to move to 2nd pass?
      //   if (distinctTypes.length == 1) {
      //
      //     const merged = this.mergeTypes(ctx.type, ctx.type.types, lossless);
      //     ctx.replacement = merged;
      //     replaced.set(ctx.type, merged);
      //   }
      // }
    });
  }

  private isEmptyOrSinglePatternProperty(type: OmniObjectType) {
    return type.properties.length === 0 || type.properties.filter(it => OmniUtil.getPropertyNamePattern(it.name) === '.*').length == 1;
  }
}
