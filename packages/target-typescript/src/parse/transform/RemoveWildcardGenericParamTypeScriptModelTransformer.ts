import {LoggerFactory} from '@omnigen/core-log';
import {OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, ParserOptions, TargetOptions} from '@omnigen/api';
import {TypeScriptOptions} from '../../options';
import {ProxyReducerOmni} from '@omnigen/core';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Will simplify `<unknown> extends Foo` into just `Foo`.
 *
 * The former is used for languages which needs to represent wildcard generic parameters more specifically, like Java `? extends Foo`.
 *
 * But for languages like TypeScript it can be removed, since just `Foo` is fine.
 */
export class RemoveWildcardGenericParamTypeScriptModelTransformer implements OmniModel2ndPassTransformer<ParserOptions & TargetOptions & TypeScriptOptions> {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & TypeScriptOptions>): void {

    // TODO: Redo back into an old visitor, since it more proven to actually work
    const reducer = ProxyReducerOmni.builder().build({
      UNKNOWN: (n, a) => {
        if (n.upperBound) {
          return a.next(n.upperBound);
        } else {
          return n;
        }
      },
    });
    const original = args.model;
    args.model = reducer.reduce(original);
  }
}
