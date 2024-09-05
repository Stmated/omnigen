import {LoggerFactory} from '@omnigen/core-log';
import {OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniTypeKind, ParserOptions, TargetOptions, UnknownKind} from '@omnigen/api';
import {OmniUtil} from '@omnigen/core';
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

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      if (ctx.type.kind === OmniTypeKind.UNKNOWN) {
        const unknownKind = ctx.type.unknownKind ?? args.options.unknownType;
        if (unknownKind === UnknownKind.ANY) {
          ctx.replacement = {
            ...ctx.type,
            unknownKind: UnknownKind.WILDCARD,
          };
        }
      } else if (ctx.type.kind === OmniTypeKind.UNION || ctx.type.kind === OmniTypeKind.EXCLUSIVE_UNION) {
        if (ctx.type.types.length === 2) {

          const oneIsUnknown = ctx.type.types.find(it => it.kind === OmniTypeKind.UNKNOWN && it.unknownKind === UnknownKind.WILDCARD);
          const oneIsUndefined = ctx.type.types.find(it => it.kind === OmniTypeKind.UNDEFINED);

          if (oneIsUndefined && oneIsUnknown) {

            // `unknown | undefined` is better off as just `unknown` since it means both.
            ctx.replacement = oneIsUnknown;
          }
        }
      }
    });
  }
}
