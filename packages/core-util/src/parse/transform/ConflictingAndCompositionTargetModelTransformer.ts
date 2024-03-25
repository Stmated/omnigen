import {
  CompositionKind,
  OmniIntersectionType,
  OmniModel2ndPassTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniType,
  OmniTypeKind,
  ParserOptions,
  TargetFeatures,
  TargetOptions,
} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil} from '../OmniUtil.ts';

const logger = LoggerFactory.create(import.meta.url);

/**
 * There might be AND-composition types that have weird restrictions, such as (`ENUM['foo']` + `string`).
 *
 * In this case we cannot represent the type in Java as exactly that. There are two alternatives:
 * * Change to common denominator and throw away enum (but maybe add a comment)
 * * Change to XOR composition, and let data consumer call correct accessors.
 */
export class ConflictingAndCompositionTargetModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs): void {

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      if (ctx.type.kind == OmniTypeKind.COMPOSITION && ctx.type.compositionKind == CompositionKind.INTERSECTION) {

        const replacement = this.replaceIntersection(ctx.type, args.targetFeatures);
        if (replacement) {
          ctx.replacement = replacement;
        }
      }
    }, undefined, false);
  }

  private replaceIntersection(type: OmniIntersectionType, features: TargetFeatures): OmniType | undefined {

    let enumCount = 0;
    let primitiveCount = 0;
    let otherCount = 0;

    for (const child of type.types) {
      if (child.kind == OmniTypeKind.ENUM) {
        enumCount++;
      } else if (child.kind == OmniTypeKind.PRIMITIVE) {
        primitiveCount++;
      } else {

        otherCount++;
      }
    }

    const mixCount = (enumCount > 0 ? 1 : 0) + (primitiveCount > 0 ? 1 : 0) + (otherCount > 0 ? 1 : 0);
    if (mixCount <= 1) {
      return undefined;
    }

    if (otherCount > 0) {

      logger.debug(`Will not be able to handle possibly conflicting AND-compositions for ${OmniUtil.describe(type)}, since it has non-primitive/enum`);
      return undefined;
    }

    const commonDenominator = OmniUtil.getCommonDenominator(features, ...type.types);
    if (commonDenominator) {
      return commonDenominator.type;
    }

    return undefined;
  }
}
