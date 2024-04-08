import {LoggerFactory} from '@omnigen/core-log';
import {OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniTypeKind, ParserOptions, TargetOptions} from '@omnigen/core';
import {TypeScriptOptions} from '../../options';
import {OmniUtil} from '@omnigen/core-util';

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

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      if (ctx.type.kind === OmniTypeKind.UNKNOWN && ctx.type.upperBound) {
        ctx.replacement = ctx.type.upperBound;
      }
    });
  }
}
