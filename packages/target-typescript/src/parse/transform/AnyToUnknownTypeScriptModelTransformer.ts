import {LoggerFactory} from '@omnigen/core-log';
import {OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniTypeKind, ParserOptions, TargetOptions, UnknownKind} from '@omnigen/api';
import {ANY_KIND, OmniUtil, ProxyReducerOmni2} from '@omnigen/core';
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
              debug: OmniUtil.addDebug(reduced.debug, 'Replaced ANY with WILDCARD (unknown) since that is preferred to ANY'),
              unknownKind: UnknownKind.WILDCARD,
            });
          }
        } else if (reduced?.kind === OmniTypeKind.UNION || reduced?.kind === OmniTypeKind.EXCLUSIVE_UNION) {
          if (reduced.types.length === 2) {

            const oneIsUnknown = reduced.types.find(it => it.kind === OmniTypeKind.UNKNOWN && it.unknownKind === UnknownKind.WILDCARD);
            const oneIsUndefined = reduced.types.find(it => it.kind === OmniTypeKind.UNDEFINED);

            if (oneIsUndefined && oneIsUnknown) {

              // `unknown | undefined` is better off as just `unknown` since it means both.
              OmniUtil.addDebugTo(oneIsUnknown, 'Removed undefined from union with unknown since unknown already covers it');
              r.replace(oneIsUnknown);
            }
          }
        }
      },
    });
  }
}
