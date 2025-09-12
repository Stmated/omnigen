import {LoggerFactory} from '@omnigen/core-log';
import {
  OmniCompositionType,
  OmniModel2ndPassTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniPrimitiveType,
  OmniTypeKind,
  ParserOptions,
  TargetOptions, UnknownKind,
} from '@omnigen/api';
import {TypeScriptOptions} from '../../options';
import {assertDefined, OmniUtil, ProxyReducerOmni2} from '@omnigen/core';

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

    const typeToUndefinedMap = new Map<number, OmniCompositionType>();

    args.model = ProxyReducerOmni2.builder().reduce(args.model, {}, {
      PROPERTY: (property, r) => {

        // Yield and replace with a reduced property, in case things are recursive.
        property = assertDefined(r.yieldBase());

        if (property.required) {
          return;
        }

        const propertyTypeId = r.getId(property.type);
        const existing = typeToUndefinedMap.get(propertyTypeId);
        if (existing) {

          r.put('type', existing);
          return;
        }

        if (OmniUtil.isComposition(property.type)) {
          // TODO: This should check recursively, since the undefined might be nested among the compositions
          if (property.type.types.find(it => OmniUtil.isUndefined(it))) {
            return;
          }
        } else if (OmniUtil.isUndefined(property.type)) {
          return;
        }

        if (property.type.kind === OmniTypeKind.UNKNOWN) {
          const unknownKind = property.type.unknownKind ?? args.options.unknownType;
          if (unknownKind === UnknownKind.ANY || unknownKind === UnknownKind.WILDCARD || unknownKind === UnknownKind.DYNAMIC) {
            // `any` can be `undefined` so no need for `undefined`.
            return;
          }
        }

        const compositionType: OmniCompositionType = {
          kind: OmniTypeKind.EXCLUSIVE_UNION,
          types: [property.type, StrictUndefinedTypeScriptModelTransformer._UNDEFINED_TYPE],
          inline: true,
          debug: OmniUtil.addDebug(property.type.debug, `Strict undefined made it an inline exclusive union of '${OmniUtil.describe(property.type)} | undefined'`),
        };

        typeToUndefinedMap.set(propertyTypeId, compositionType);

        r.put('type', compositionType);
      },
    });

    // // REMOVE
    // OmniUtil.visitTypesDepthFirst(args.model, ctx => {
    //
    //   const properties = OmniUtil.getPropertiesOf(ctx.type);
    //   for (const property of properties) {
    //     if (property.required) {
    //       continue;
    //     }
    //
    //     const existing = typeToUndefinedMap.get(property.type);
    //     if (existing) {
    //
    //       property.type = existing;
    //       continue;
    //     }
    //
    //     if (OmniUtil.isComposition(property.type)) {
    //       if (property.type.types.find(it => OmniUtil.isUndefined(it))) {
    //         continue;
    //       }
    //     } else if (OmniUtil.isUndefined(property.type)) {
    //       continue;
    //     }
    //
    //     if (property.type.kind === OmniTypeKind.UNKNOWN) {
    //       const unknownKind = property.type.unknownKind ?? args.options.unknownType;
    //       if (unknownKind === UnknownKind.ANY || unknownKind === UnknownKind.WILDCARD || unknownKind === UnknownKind.DYNAMIC) {
    //         // `any` can be `undefined` so no need for `undefined`.
    //         continue;
    //       }
    //     }
    //
    //     const compositionType: OmniCompositionType = {
    //       kind: OmniTypeKind.EXCLUSIVE_UNION,
    //       types: [property.type, StrictUndefinedTypeScriptModelTransformer._UNDEFINED_TYPE],
    //       inline: true,
    //       debug: OmniUtil.addDebug(property.type.debug, `Strict undefined made it an inline exclusive union of '${OmniUtil.describe(property.type)} | undefined'`),
    //     };
    //
    //     typeToUndefinedMap.set(property.type, compositionType);
    //
    //     property.type = compositionType;
    //   }
    // });
  }
}
