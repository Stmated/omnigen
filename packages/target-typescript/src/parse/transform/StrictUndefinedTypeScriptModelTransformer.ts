import {LoggerFactory} from '@omnigen/core-log';
import {
  OmniCompositionType,
  OmniModel2ndPassTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniPrimitiveType,
  OmniType,
  OmniTypeKind,
  ParserOptions,
  TargetOptions, UnknownKind,
} from '@omnigen/api';
import {TypeScriptOptions} from '../../options';
import {OmniUtil} from '@omnigen/core';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Will make the type of properties that are not required into a union type of `T | undefined`
 */
export class StrictUndefinedTypeScriptModelTransformer implements OmniModel2ndPassTransformer<ParserOptions & TargetOptions & TypeScriptOptions> {

  private static readonly _UNDEFINED_TYPE: OmniPrimitiveType = {
    kind: OmniTypeKind.UNDEFINED,
  };

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs<ParserOptions & TargetOptions & TypeScriptOptions>): void {

    if (args.options.strictUndefined) {
      return;
    }

    const typeToUndefinedMap = new Map<OmniType, OmniCompositionType>();

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      const properties = OmniUtil.getPropertiesOf(ctx.type);
      for (const property of properties) {
        if (property.required) {
          continue;
        }

        const existing = typeToUndefinedMap.get(property.type);
        if (existing) {

          property.type = existing;
          continue;
        }

        if (OmniUtil.isComposition(property.type)) {

          if (property.type.types.find(it => OmniUtil.isUndefined(it))) {
            continue;
          }
        }

        if (OmniUtil.isUndefined(property.type)) {
          continue;
        }

        if (property.type.kind === OmniTypeKind.UNKNOWN && property.type.unknownKind === UnknownKind.ANY) {
          // `any` can be `undefined` so no need for `undefined`.
          continue;
        }

        const compositionType: OmniCompositionType = {
          kind: OmniTypeKind.EXCLUSIVE_UNION,
          types: [property.type, StrictUndefinedTypeScriptModelTransformer._UNDEFINED_TYPE],
          inline: true,
          debug: OmniUtil.addDebug(property.type.debug, 'Strict undefined made it an inline exclusive union of `T | undefined`'),
        };

        typeToUndefinedMap.set(property.type, compositionType);

        property.type = compositionType;
      }
    });
  }
}
