import {LoggerFactory} from '@omnigen/core-log';
import {OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniTypeKind, ParserOptions, TargetOptions, UnknownKind} from '@omnigen/api';
import {ANY_KIND, ProxyReducerOmni2} from '@omnigen/core';
import {TypeScriptOptions} from '../../options';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Replaces any `any` with `unknown` instead. Useful if the target project does not allow `any`
 */
export class AnyToUnknownTypeScriptModelTransformer implements OmniModel2ndPassTransformer<ParserOptions & TargetOptions & TypeScriptOptions> {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & TypeScriptOptions>): void {

    if (args.options.anyAllowed) {
      return;
    }

    args.model = ProxyReducerOmni2.builder().reduce(args.model, {}, {
      [ANY_KIND]: (_, r) => {

        const reduced = r.yieldBase();
        if (reduced?.kind === OmniTypeKind.UNKNOWN) {
          const unknownKind = reduced.unknownKind ?? args.options.unknownType;
          if (unknownKind === UnknownKind.ANY) {
            r.replace({
              ...reduced,
              unknownKind: UnknownKind.WILDCARD,
            });
          }
        } else if (reduced?.kind === OmniTypeKind.UNION || reduced?.kind === OmniTypeKind.EXCLUSIVE_UNION) {
          if (reduced.types.length === 2) {

            const oneIsUnknown = reduced.types.find(it => it.kind === OmniTypeKind.UNKNOWN && it.unknownKind === UnknownKind.WILDCARD);
            const oneIsUndefined = reduced.types.find(it => it.kind === OmniTypeKind.UNDEFINED);

            if (oneIsUndefined && oneIsUnknown) {

              // `unknown | undefined` is better off as just `unknown` since it means both.
              r.replace(oneIsUnknown);
            }
          }
        }
      },
    });

    // // REMOVE
    // OmniUtil.visitTypesDepthFirst(args.model, ctx => {
    //
    //   if (ctx.type.kind === OmniTypeKind.UNKNOWN) {
    //     const unknownKind = ctx.type.unknownKind ?? args.options.unknownType;
    //     if (unknownKind === UnknownKind.ANY) {
    //       ctx.replacement = {
    //         ...ctx.type,
    //         unknownKind: UnknownKind.WILDCARD,
    //       };
    //     }
    //   } else if (ctx.type.kind === OmniTypeKind.UNION || ctx.type.kind === OmniTypeKind.EXCLUSIVE_UNION) {
    //     if (ctx.type.types.length === 2) {
    //
    //       const oneIsUnknown = ctx.type.types.find(it => it.kind === OmniTypeKind.UNKNOWN && it.unknownKind === UnknownKind.WILDCARD);
    //       const oneIsUndefined = ctx.type.types.find(it => it.kind === OmniTypeKind.UNDEFINED);
    //
    //       if (oneIsUndefined && oneIsUnknown) {
    //
    //         // `unknown | undefined` is better off as just `unknown` since it means both.
    //         ctx.replacement = oneIsUnknown;
    //       }
    //     }
    //   }
    // });
  }
}
