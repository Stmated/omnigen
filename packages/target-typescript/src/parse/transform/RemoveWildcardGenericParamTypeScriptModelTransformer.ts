import {LoggerFactory} from '@omnigen/core-log';
import {OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, ParserOptions, TargetOptions} from '@omnigen/api';
import {TypeScriptOptions} from '../../options';
import {ProxyReducerOmni2} from '@omnigen/core';

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

    args.model = ProxyReducerOmni2.builder().build({
      UNKNOWN: (n, r) => {
        if (n.upperBound) {
          r.replace(r.reduce(n.upperBound)).yieldBase();
        }
      },
    }).reduce(args.model);

    // // REMOVE
    // const original = ;
    // args.model = reducer;
    // args.model = reduced;

    // TODO: Replace with ProxyReducerOmni2 once it has been improved
    // const reducer = ProxyReducerOmni.builder().build({
    //   UNKNOWN: (n, a) => {
    //     if (n.upperBound) {
    //       return a.next(n.upperBound);
    //     } else {
    //       return n;
    //     }
    //   },
    // });
    // const original = args.model;
    // args.model = reducer.reduce(original);
  }
}
