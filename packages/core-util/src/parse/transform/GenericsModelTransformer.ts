import {
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniGenericTargetIdentifierType,
  OmniGenericTargetType,
  OmniModelTransformer,
  OmniPropertyOwner,
  OmniType,
  OmniTypeKind,
  ParserOptions,
} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';
import {OMNI_GENERIC_FEATURES, TargetFeatures} from '@omnigen/core';
import {PropertyUtil} from '../PropertyUtil';
import {OmniModelTransformerArgs} from '@omnigen/core';
import {PropertyDifference} from '@omnigen/core';
import {OmniUtil} from '../OmniUtil';
import {EqualityFinder} from '../../equality';
import {Naming} from '../Naming';
import {Case, Sorters} from '../../util';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Takes an OmniModel, and tries to modify it to use generics where possible.
 * This will remove the need for a lot of extra types, and make code more readable.
 */
export class GenericsModelTransformer implements OmniModelTransformer<ParserOptions> {

  transformModel(args: OmniModelTransformerArgs<ParserOptions>): void {

    if (!args.options.generifyTypes) {
      return;
    }

    const superTypeToSubTypes = OmniUtil.getSuperTypeToSubTypesMap(args.model);

    const dependencySorter = Sorters.byDependencies(args.model);

    const superTypes = [...superTypeToSubTypes.keys()].sort((a, b) => {
      const aSubType = (superTypeToSubTypes.get(a) || [])[0];
      const bSubType = (superTypeToSubTypes.get(b) || [])[0];
      return dependencySorter(aSubType, bSubType);
    });

    for (const superType of superTypes) {

      if (superType.kind == OmniTypeKind.GENERIC_TARGET
        || superType.kind == OmniTypeKind.COMPOSITION
        || superType.kind == OmniTypeKind.ENUM
        || superType.kind == OmniTypeKind.HARDCODED_REFERENCE) {
        continue;
      }

      if (superType.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {

        // TODO: Add later -- right now we don't know for sure if it is a type that can be made generic
        //        Need a "asSuperGenericType" in JavaUtil
        continue;
      }

      const subTypes = superTypeToSubTypes.get(superType);
      if (!subTypes) {
        continue;
      }

      const commonProperties = PropertyUtil.getCommonProperties(
        // We do not care *at all* if they have nothing in-common. Just nice if get one.
        () => false,
        pdiff => EqualityFinder.matchesPropDiff(pdiff, PropertyDifference.META),

        OMNI_GENERIC_FEATURES,
        ...subTypes,
      );

      const genericSource: OmniGenericSourceType = {
        kind: OmniTypeKind.GENERIC_SOURCE,
        of: superType,
        sourceIdentifiers: [],
      };

      const ownerToGenericTargetMap = new Map<OmniPropertyOwner, OmniGenericTargetType>();
      const propertyNameExpansions = new Map<string, OmniGenericSourceIdentifierType[]>();
      for (const propertyName in commonProperties.byPropertyName) {
        if (!Object.hasOwn(commonProperties.byPropertyName, propertyName)) {
          continue;
        }

        const info = commonProperties.byPropertyName[propertyName];
        if (info.distinctTypes.length <= 1) {

          // There are 1 or less distinct types, so we will not replace it with generics.
          continue;
        }

        const genericName = (Object.keys(commonProperties.byPropertyName).length == 1) ? 'T' : `T${Case.pascal(propertyName)}`;

        const lowerBound = this.toGenericBoundType(info.commonType, args, OMNI_GENERIC_FEATURES);
        if (lowerBound) {
          const expandedGenericSourceIdentifier = this.expandLowerBoundGenericIfPossible(
            lowerBound,
            genericSource,
            args,
            OMNI_GENERIC_FEATURES,
          );
          if (expandedGenericSourceIdentifier) {
            propertyNameExpansions.set(propertyName, [expandedGenericSourceIdentifier]);
          }
        }

        const genericSourceIdentifier: OmniGenericSourceIdentifierType = {
          kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
          placeholderName: genericName,
          // knownEdgeTypes: info.distinctTypes,
        };

        if (lowerBound) {
          genericSourceIdentifier.lowerBound = lowerBound;
        }

        genericSource.sourceIdentifiers.push(genericSourceIdentifier);

        if (args.options.generificationBoxAllowed == false) {
          if (info.properties.map(it => it.type).find(it => !OmniUtil.isGenericAllowedType(it))) {
            logger.warn(`Skipping '${propertyName}' since some property types cannot be made generic`);
            continue;
          }
        }

        for (const property of info.properties) {

          // Get or create the GenericTarget, which we found based on the property owner.
          let genericTarget = ownerToGenericTargetMap.get(property.owner);
          if (!genericTarget) {
            genericTarget = {
              kind: OmniTypeKind.GENERIC_TARGET,
              source: genericSource,
              targetIdentifiers: [],
            };

            if (ownerToGenericTargetMap.size == 0) {

              // Swap all places that uses the superType with the new GenericSource.
              // We do this for the first time we alter the GenericTarget, to do it as late as possible.
              OmniUtil.swapType(args.model, superType, genericSource);
            }

            ownerToGenericTargetMap.set(property.owner, genericTarget);

            if ('extendedBy' in property.owner) {

              // Replace the extended by from the original type to the generic target type.
              property.owner.extendedBy = genericTarget;
            }
          }

          // TODO: Improve the readability and flexibility of this whole expansion thing.
          //        Right now very hard-coded. Can only handle one expansion, and takes no heed to "UNKNOWN" types.
          const expansions = propertyNameExpansions.get(propertyName);
          if (expansions && expansions.length > 0) {

            if (property.type.kind == OmniTypeKind.OBJECT) {
              if (property.type.extendedBy && property.type.extendedBy.kind == OmniTypeKind.GENERIC_TARGET) {

                // Let's expand the property's generic target identifiers into this current generic type.
                // TODO: This should probably be done recursively somehow, so any depth is handled.
                const targets = property.type.extendedBy.targetIdentifiers;
                genericTarget.targetIdentifiers.push(...targets);
              }
            }
          }

          const targetIdentifier: OmniGenericTargetIdentifierType = {
            kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
            // It will always find something in the map, but we do this to make the compiler happy.
            type: property.type,
            sourceIdentifier: genericSourceIdentifier,
          };
          genericTarget.targetIdentifiers.push(targetIdentifier);

          // Remove the now generic property from the original property owner.
          const idx = property.owner.properties.indexOf(property);
          property.owner.properties.splice(idx, 1);
        }

        if ('properties' in genericSource.of) {
          genericSource.of.properties.push({
            name: propertyName,
            type: genericSourceIdentifier,
            owner: genericSource.of,
          });
        }
      }
    }

    return;
  }

  private expandLowerBoundGenericIfPossible(
    lowerBound: OmniType,
    genericSource: OmniGenericSourceType,
    args: OmniModelTransformerArgs<ParserOptions>,
    targetFeatures: TargetFeatures,
  ): OmniGenericSourceIdentifierType | undefined {

    if (lowerBound.kind != OmniTypeKind.GENERIC_TARGET) {

      // We only expand the bound if it is a generic target
      return undefined;
    }

    if (lowerBound.targetIdentifiers.length != 1) {

      // For now we only support if there is one, for simplicity. Needs improvement in the future.
      return undefined;
    }

    const lowerBoundLowerBound = lowerBound.targetIdentifiers[0].sourceIdentifier.lowerBound;
    if (!lowerBoundLowerBound || lowerBoundLowerBound.kind == OmniTypeKind.UNKNOWN) {

      // If the lower bound of the identifier is unknown, then it makes no sense exploding it.
      // It should just be rendered as "Class" or "Class<?>" or "Class<>" depending on context.
      return undefined;
    }

    // The property generic type is itself a generic target.
    // This can for example be: <T extends JsonRpcRequest<AbstractRequestParams>>
    // To make it better and more exact to work with, we should replace with this:
    // <TData extends AbstractRequestParams, T extends JsonRpcRequest<TData>>
    const targetIdentifier = lowerBound.targetIdentifiers[0];
    const sourceIdentifierLowerBound = this.toGenericBoundType(targetIdentifier.type, args, targetFeatures);

    const sourceDesc = OmniUtil.describe(targetIdentifier.sourceIdentifier);
    const targetDesc = OmniUtil.describe(targetIdentifier);
    const lowerDesc = OmniUtil.describe(lowerBound);

    const sourceIdentifier: OmniGenericSourceIdentifierType = {
      placeholderName: this.getExplodedSourceIdentifierName(targetIdentifier.sourceIdentifier),
      kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
      debug: `Exploded from '${sourceDesc}' of '${targetDesc}' of '${lowerDesc}'`,
    };

    if (sourceIdentifierLowerBound) {
      sourceIdentifier.lowerBound = sourceIdentifierLowerBound;
    }

    genericSource.sourceIdentifiers.push(sourceIdentifier);
    lowerBound.targetIdentifiers[0] = {
      kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
      type: sourceIdentifier,
      sourceIdentifier: sourceIdentifier,
    };

    return sourceIdentifier;
  }

  private toGenericBoundType(
    targetIdentifierType: OmniType | undefined,
    args: OmniModelTransformerArgs<ParserOptions>,
    targetFeatures: TargetFeatures,
  ): OmniType | undefined {

    if (!targetIdentifierType || targetIdentifierType.kind == OmniTypeKind.UNKNOWN) {
      return undefined;
    }

    return targetIdentifierType;
  }

  private getExplodedSourceIdentifierName(identifier: OmniGenericSourceIdentifierType): string {

    if (identifier.lowerBound) {

      // TODO: This needs to be improved someday. It should be based on the property name, and not guessed from type.
      const lowerName = Naming.unwrap(OmniUtil.getVirtualTypeName(identifier.lowerBound));
      const words = lowerName.split(/(?=[A-Z])/);
      if (words.length > 2) {
        return `T${words[words.length - 2]}${words[words.length - 1]}`;
      } else if (words.length > 1) {
        return `T${words[words.length - 1]}`;
      }
    }

    return `TExploded${identifier.placeholderName}`;
  }
}
