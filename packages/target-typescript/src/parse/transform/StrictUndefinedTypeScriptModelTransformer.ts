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
import {OmniUtil, ProxyReducer, ProxyReducerOmni} from '@omnigen/core';

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

    // args.model = ProxyReducerOmni.builder().build({
    //   PROPERTY: (n, r) => {
    //
    //     if (n.required) {
    //       return r.next(n);
    //     }
    //
    //     // if (ProxyReducer.isProxy(n.type)) {
    //     //   const i = 0;
    //     // }
    //
    //     // const existing = typeToUndefinedMap.get(n.type);
    //     // if (existing) {
    //     //   // TODO: Move to an "any"?
    //     //   n.type = existing;
    //     //   return r.next(n);
    //     // }
    //
    //     if (OmniUtil.isComposition(n.type)) {
    //       if (n.type.types.find(it => OmniUtil.isUndefined(it))) {
    //         return r.next(n);
    //       }
    //     } else if (OmniUtil.isUndefined(n.type)) {
    //       return r.next(n);
    //     }
    //
    //     if (n.type.kind === OmniTypeKind.UNKNOWN && n.type.unknownKind === UnknownKind.ANY) {
    //       // `any` can be `undefined` so no need for `undefined`.
    //       return r.next(n);
    //     }
    //
    //     const compositionType: OmniCompositionType = {
    //       kind: OmniTypeKind.EXCLUSIVE_UNION,
    //       types: [r.next(n.type)!, StrictUndefinedTypeScriptModelTransformer._UNDEFINED_TYPE],
    //       inline: true,
    //       debug: OmniUtil.addDebug(n.type.debug, `Strict undefined made it an inline exclusive union of '${OmniUtil.describe(n.type)} | undefined'`),
    //     };
    //
    //     n.type = compositionType;
    //
    //     // const reduced = r.next(compositionType)!;
    //     // if (ProxyReducer.isProxy(reduced)) {
    //     //   const i = 0;
    //     // }
    //     // if (reduced.kind === OmniTypeKind.EXCLUSIVE_UNION) {
    //     //   typeToUndefinedMap.set(n.type, reduced);
    //     // }
    //     //
    //     // n.type = reduced;
    //     return r.next(n);
    //   },
    // }).reduce(args.model);

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
        } else if (OmniUtil.isUndefined(property.type)) {
          continue;
        }

        if (property.type.kind === OmniTypeKind.UNKNOWN) {
          const unknownKind = property.type.unknownKind ?? args.options.unknownType;
          if (unknownKind === UnknownKind.ANY || unknownKind === UnknownKind.WILDCARD || unknownKind === UnknownKind.DYNAMIC) {
            // `any` can be `undefined` so no need for `undefined`.
            continue;
          }
        }

        const compositionType: OmniCompositionType = {
          kind: OmniTypeKind.EXCLUSIVE_UNION,
          types: [property.type, StrictUndefinedTypeScriptModelTransformer._UNDEFINED_TYPE],
          inline: true,
          debug: OmniUtil.addDebug(property.type.debug, `Strict undefined made it an inline exclusive union of '${OmniUtil.describe(property.type)} | undefined'`),
        };

        typeToUndefinedMap.set(property.type, compositionType);

        property.type = compositionType;
      }
    });
  }
}
