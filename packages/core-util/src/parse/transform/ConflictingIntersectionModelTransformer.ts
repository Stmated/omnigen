import {
  AllowedEnumTsTypes,
  OmniIntersectionType,
  OmniModel2ndPassTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniType,
  OmniTypeKind,
  TargetFeatures,
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
export class ConflictingIntersectionModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs): void {

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {

      if (ctx.type.kind === OmniTypeKind.INTERSECTION) {

        const replacement = this.replaceIntersection(ctx.type, args.targetFeatures);
        if (replacement) {
          ctx.replacement = replacement;
        }
      }
    }, undefined, true);
  }

  private replaceIntersection(type: OmniIntersectionType, features: TargetFeatures): OmniType | undefined {

    let enumCount = 0;
    let primitiveCount = 0;
    let otherCount = 0;

    const descriptions: string[] = [];
    const summaries: string[] = [];
    const enumValues: AllowedEnumTsTypes[] = [];

    if (type.description) {
      descriptions.push(type.description);
    }

    if (type.summary) {
      summaries.push(type.summary);
    }

    for (const child of type.types) {
      if (child.kind === OmniTypeKind.ENUM) {
        enumCount++;
        if (child.enumConstants) {
          enumValues.push(...child.enumConstants);
        }
      } else if (OmniUtil.isPrimitive(child)) {
        primitiveCount++;
      } else {
        otherCount++;
      }

      if (child.summary) {
        summaries.push(child.summary);
      }

      if (child.description) {
        descriptions.push(child.description);
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

      logger.info(JSON.stringify(type));

      if (descriptions.length > 0) {
        const str = descriptions.join(', ');
        commonDenominator.type.description = `${commonDenominator.type.description ?? ''}${str}`;
      }

      if (summaries.length > 0) {
        const str = summaries.join(', ');
        commonDenominator.type.summary = `${commonDenominator.type.summary ?? ''}${str}`;
      }

      if (enumValues.length > 0) {

        if (!commonDenominator.type.examples) {
          commonDenominator.type.examples = [];
        }

        for (const value of enumValues) {
          if (!commonDenominator.type.examples.find(it => it.value == value)) {
            commonDenominator.type.examples.push({
              value: value,
            });
          }
        }
      }

      return commonDenominator.type;
    }

    return undefined;
  }
}
