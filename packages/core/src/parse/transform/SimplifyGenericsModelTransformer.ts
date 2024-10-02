import {OmniGenericSourceIdentifierType, OmniGenericSourceType, OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniType, OmniTypeKind, TypeDiffKind} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil} from '../OmniUtil';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Takes an OmniModel, and tries to modify it to use generics where possible.
 * This will remove the need for a lot of extra types, and make code more readable.
 */
export class SimplifyGenericsModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs): void {

    // if (true) {
    //   return;
    // }

    type TargetInfo = { source: OmniGenericSourceType, targetTypes: Set<OmniType> };
    const sourceIdentifierToTargetsMap = new Map<OmniGenericSourceIdentifierType, TargetInfo>();

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      if (ctx.type.kind === OmniTypeKind.GENERIC_TARGET) {

        for (const target of ctx.type.targetIdentifiers) {

          const sourceIdentifier = target.sourceIdentifier;
          if (target.type.kind === OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
            logger.trace(`Skipping potential simplification of ${OmniUtil.describe(sourceIdentifier)}, since it is referring to ${OmniUtil.describe(target.type)}`);
            continue;
          }

          const info = (
            sourceIdentifierToTargetsMap.has(sourceIdentifier)
              ? sourceIdentifierToTargetsMap
              : sourceIdentifierToTargetsMap.set(sourceIdentifier, {source: ctx.type.source, targetTypes: new Set()})
          ).get(sourceIdentifier)!;

          // const normalizedType = OmniUtil.asNonNullableIfHasDefault(target.type, args.features);
          info.targetTypes.add(target.type);
        }
      }
    });

    const allowedDiffs: TypeDiffKind[] = [];
    if (!args.features.primitiveGenerics) {
      allowedDiffs.push(TypeDiffKind.NULLABILITY);
    }
    if (!args.features.literalTypes) {
      allowedDiffs.push(TypeDiffKind.CONCRETE_VS_ABSTRACT);
      allowedDiffs.push(TypeDiffKind.POLYMORPHIC_LITERAL);
    } else {
      // TODO: Play around with this! Need it to work with both Java and TypeScript!
      // allowedDiffs.push(TypeDiffKind.CONCRETE_VS_ABSTRACT);
      // allowedDiffs.push(TypeDiffKind.POLYMORPHIC_LITERAL);
    }

    const sourceIdentifierReplacements = new Map<OmniGenericSourceIdentifierType, OmniType>();
    for (const [sourceIdentifier, info] of sourceIdentifierToTargetsMap.entries()) {

      let replacement: OmniType | undefined = undefined;
      if (info.targetTypes.size == 1) {
        // replacement = [...info.targetTypes.values()][0];
      } else {

        const distinctTypes = OmniUtil.getDistinctTypes(
          [...info.targetTypes],
          args.features,
          diff => allowedDiffs.includes(diff),
        );

        if (distinctTypes.length === 1) {

          // This is not necessarily the best type to pick!
          // We just know what types are NOT distinct, according to the language features.
          // But one type might be Literal String and the other a regular String.
          // We should then prefer to have the regular String as result here, to not confuse other code.
          replacement = OmniUtil.getGeneralizedType(distinctTypes[0]);
        }
      }

      if (replacement) {
        sourceIdentifierReplacements.set(sourceIdentifier, replacement);
      }
    }

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {
      if (ctx.type.kind === OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
        const replacement = sourceIdentifierReplacements.get(ctx.type.sourceIdentifier);
        if (replacement) {
          ctx.replacement = null;
        }
      } else if (ctx.type.kind === OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
        const replacement = sourceIdentifierReplacements.get(ctx.type);
        if (replacement) {
          ctx.replacement = replacement;
        }
      } else if (ctx.type.kind === OmniTypeKind.GENERIC_SOURCE) {
        for (let i = ctx.type.sourceIdentifiers.length - 1; i >= 0; i--) {
          if (sourceIdentifierReplacements.has(ctx.type.sourceIdentifiers[i])) {
            ctx.type.sourceIdentifiers.splice(i, 1);
          }
        }

        if (ctx.type.sourceIdentifiers.length === 0) {
          ctx.replacement = ctx.type.of;
        }

      } else if (ctx.type.kind === OmniTypeKind.GENERIC_TARGET) {
        for (let i = ctx.type.targetIdentifiers.length - 1; i >= 0; i--) {
          if (sourceIdentifierReplacements.has(ctx.type.targetIdentifiers[i].sourceIdentifier)) {
            ctx.type.targetIdentifiers.splice(i, 1);
          }
        }

        if (ctx.type.targetIdentifiers.length === 0) {
          ctx.replacement = ctx.type.source.of;
        }
      }
    });
  }
}
