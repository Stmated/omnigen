import {LoggerFactory} from '@omnigen/core-log';
import {
  OmniInterfaceType,
  OmniIntersectionType,
  OmniModel2ndPassTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  ParserOptions,
  TargetOptions,
} from '@omnigen/api';
import {OmniUtil, ProxyReducerOmni2} from '@omnigen/core';
import {TypeScriptOptions} from '../../options';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Will inline any composition that does not already have a name, since that will likely look the best in TypeScript.
 */
export class InlineUnnamedCompositionsTypeScriptModelTransformer implements OmniModel2ndPassTransformer<ParserOptions & TargetOptions & TypeScriptOptions> {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & TypeScriptOptions>): void {

    args.model = ProxyReducerOmni2.builder().build({
      UNION: (n, r) => {
        const reduced = r.yieldBase();
        if (reduced && OmniUtil.isComposition(reduced) && reduced.inline === undefined && !reduced.name) {
          r.put('inline', true);
        }
        return reduced;
      },
      EXCLUSIVE_UNION: (n, r) => {
        const reduced = r.yieldBase();
        if (reduced && OmniUtil.isComposition(reduced) && reduced.inline === undefined && !reduced.name) {
          r.put('inline', true);
        }
        return reduced;
      },
      INTERSECTION: (n, r) => {
        const reduced = r.yieldBase();
        if (reduced && OmniUtil.isComposition(reduced) && reduced.inline === undefined && !reduced.name) {
          r.put('inline', true);
        }
        return reduced;
      },
    }).reduce(args.model);
  }
}
