import {OmniModelTransformer, OmniModelTransformerArgs, OmniTypeKind, ParserOptions} from '@omnigen/api';
import {OmniUtil} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

/**
 * For languages which cannot represent aggregates, we need to take other steps and do the best that we can to make it representable.
 */
export class AggregateIntersectionsModelTransformer implements OmniModelTransformer {

  transformModel(args: OmniModelTransformerArgs): void {

    // OmniUtil.visitTypesDepthFirst(args.model, ctx => {
    //
    //   // if (ctx.type.kind === OmniTypeKind.INTERSECTION) {
    //   //
    //   //   // NOTE: Wrong and bad, but what we have to work with at the moment.
    //   //   ctx.replacement = ctx.type.types[0];
    //   // }
    // });
  }
}
