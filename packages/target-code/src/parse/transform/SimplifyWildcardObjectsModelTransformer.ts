import {OmniModelTransformer, OmniModelTransformerArgs, OmniObjectType, OmniTypeKind, OmniUnknownType, ParserOptions, UnknownKind} from '@omnigen/core';
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
      }
    });
  }

  private isEmptyOrSinglePatternProperty(type: OmniObjectType) {
    return type.properties.length === 0 || type.properties.filter(it => OmniUtil.getPropertyNamePattern(it.name) === '.*').length == 1;
  }
}
