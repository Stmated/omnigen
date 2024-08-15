import {OmniEnumMember, OmniExample, OmniIntersectionType, OmniItemKind, OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniType, OmniTypeKind, TargetFeatures} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil} from '../OmniUtil.ts';
import {ProxyReducerOmni} from '../ProxyReducerOmni.ts';

const logger = LoggerFactory.create(import.meta.url);

/**
 * There might be AND-composition types that have weird restrictions, such as (`ENUM['foo']` + `string`).
 *
 * In this case we cannot represent the type in Java as exactly that. There are two alternatives:
 * - Change to common denominator and throw away enum (but maybe add a comment)
 * - Change to XOR composition, and let data consumer call correct accessors.
 */
export class ConflictingIntersectionModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs): void {

    const reducer = ProxyReducerOmni.create({
      INTERSECTION: (n, a) => this.replaceIntersection(n, args.targetFeatures) ?? a.reducer.reduce(n), // .base.INTERSECTION(n, a),
    });
    args.model = reducer.reduce(args.model);
  }

  private replaceIntersection(type: OmniIntersectionType, features: TargetFeatures): OmniType | undefined {

    let enumCount = 0;
    let primitiveCount = 0;
    let otherCount = 0;

    const descriptions: string[] = [];
    const summaries: string[] = [];
    const enumMembers: OmniEnumMember[] = [];

    if (type.description) {
      descriptions.push(type.description);
    }

    if (type.summary) {
      summaries.push(type.summary);
    }

    for (const child of type.types) {
      if (child.kind === OmniTypeKind.ENUM) {
        enumCount++;
        enumMembers.push(...child.members);
      } else if (OmniUtil.isPrimitive(child)) {
        primitiveCount++;
      } else {
        otherCount++;
      }

      if (child.description) {
        if (type.description) {
          summaries.push(child.description);
        } else {
          descriptions.push(child.description);
        }
      }

      if (child.summary) {
        summaries.push(child.summary);
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

    const commonDenominator = OmniUtil.getCommonDenominator(features, type.types);
    if (commonDenominator) {

      if (type.name && OmniUtil.isNameable(commonDenominator.type)) {
        commonDenominator.type.name = type.name;
      }

      if (summaries.length > 0) {
        const str = summaries.join(', ');
        commonDenominator.type.summary = `${commonDenominator.type.summary ?? ''}${str}`;
      }

      if (descriptions.length > 0) {
        const str = descriptions.join(', ');
        commonDenominator.type.description = `${commonDenominator.type.description ?? ''}${str}`;
      }

      if (enumMembers.length > 0) {

        if (!commonDenominator.type.examples) {
          commonDenominator.type.examples = [];
        }

        for (const member of enumMembers) {
          if (!commonDenominator.type.examples.find(it => it.value == member.value)) {

            const example: OmniExample<typeof member.value> = {
              kind: OmniItemKind.EXAMPLE,
              value: member.value,
              description: member.description ?? member.name,
            };

            commonDenominator.type.examples.push(example);
          }
        }
      }

      return commonDenominator.type;
    }

    return undefined;
  }
}
