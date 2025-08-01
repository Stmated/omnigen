import {OmniGenericSourceIdentifierType, OmniGenericSourceType, OmniModel2ndPassTransformer, OmniModelTransformer2ndPassArgs, OmniType, OmniTypeKind, TypeDiffKind} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil} from '../OmniUtil';
import {ProxyReducerOmni2} from '../../reducer2/ProxyReducerOmni2.ts';
import {ANY_KIND} from '../../reducer2/types.ts';

const logger = LoggerFactory.create(import.meta.url);

export class SimplifyGenericsModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs): void {

    type TargetInfo = { source: OmniGenericSourceType, targetTypes: Set<OmniType> };
    const sourceIdentifierToTargetsMap = new Map<OmniGenericSourceIdentifierType, TargetInfo>();

    const reducer = ProxyReducerOmni2.builder().build();
    ProxyReducerOmni2.builder().reduce(args.model, {immutable: true}, {
      GENERIC_TARGET: (n, r) => {
        for (const target of n.targetIdentifiers) {

          const sourceIdentifier = target.sourceIdentifier;
          if (target.type.kind === OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
            logger.trace(`Skipping potential simplification of ${OmniUtil.describe(sourceIdentifier)}, since it is referring to ${OmniUtil.describe(target.type)}`);
            continue;
          }

          const info = (
            sourceIdentifierToTargetsMap.has(sourceIdentifier)
              ? sourceIdentifierToTargetsMap
              : sourceIdentifierToTargetsMap.set(sourceIdentifier, {source: n.source, targetTypes: new Set()})
          ).get(sourceIdentifier)!;

          info.targetTypes.add(target.type);
        }
        r.callBase();
      },
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

    const sourceIdentifierReplacements = new Map<OmniGenericSourceIdentifierType, OmniType>(); // TODO: REMOVE!
    const sourceIdentifierIdReplacements = new Map<number, OmniType>();

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
        sourceIdentifierIdReplacements.set(reducer.getId(sourceIdentifier), replacement);
      }
    }

    args.model = ProxyReducerOmni2.builder().reduce(args.model, {}, {
      GENERIC_TARGET_IDENTIFIER: (n, r) => {
        const replacement = sourceIdentifierIdReplacements.get(r.getId(n.sourceIdentifier));
        if (replacement) {
          return r.remove();
        }
        return r.callBase();
      },

      // TODO: Split out content from the `ANY_KIND` into separate spec entries. They give better type security.
      [ANY_KIND]: (n, r) => {

        if (n.kind === OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
          const replacement = sourceIdentifierIdReplacements.get(r.getId(n));
          if (replacement) {
            // TODO: Should not need to modify the object to be writeable!
            return r.replace(r.reduce(replacement));
          }
        } else if (n.kind === OmniTypeKind.GENERIC_SOURCE) {
          for (let i = n.sourceIdentifiers.length - 1; i >= 0; i--) {
            if (sourceIdentifierIdReplacements.has(r.getId(n.sourceIdentifiers[i]))) {
              // TODO: Should not change the immutable model! It should be properly, separately, reduced!
              n.sourceIdentifiers.splice(i, 1);
            }
          }

          if (n.sourceIdentifiers.length === 0) {
            const reduced = r.reduce(n.of);
            if (reduced) {
              return r.replace(reduced);
            } else {
              return r.remove();
            }
          }

        } else if (n.kind === OmniTypeKind.GENERIC_TARGET) {
          for (let i = n.targetIdentifiers.length - 1; i >= 0; i--) {
            if (sourceIdentifierIdReplacements.has(r.getId(n.targetIdentifiers[i].sourceIdentifier))) {
              // TODO: Should not change the immutable model! It should be properly, separately, reduced!
              n.targetIdentifiers.splice(i, 1);
            }
          }

          if (n.targetIdentifiers.length === 0) {
            const reduced = r.reduce(n.source.of);
            if (reduced) {
              return r.replace(reduced);
            } else {
              return r.remove();
            }
          }
        }

        return r.callBase();
      },
    });
  }
}
