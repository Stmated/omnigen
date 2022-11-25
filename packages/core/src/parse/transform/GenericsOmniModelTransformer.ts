import {
  Naming,
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniGenericTargetIdentifierType,
  OmniGenericTargetType,
  OmniModel,
  OmniModelTransformer,
  OmniPrimitiveBoxMode,
  OmniPropertyOwner,
  OmniType,
  OmniTypeKind,
  OmniUtil,
} from '../../parse/index.js';
import {LoggerFactory} from '@omnigen/core-log';
import {PrimitiveGenerificationChoice, RealOptions} from '../../options/index.js';
import {GenericTargetOptions} from '../../interpret/index.js';
import {PropertyUtil} from '../PropertyUtil.js';
import {EqualityLevel} from '../EqualityLevel.js';
import {Case, Sorters} from '../../util/index.js';
import {PropertyInformation} from '../PropertiesInformation.js';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Takes an OmniModel, and tries to modify it to use generics where possible.
 * This will remove the need for a lot of extra types, and make code more readable.
 */
export class GenericsOmniModelTransformer implements OmniModelTransformer<GenericTargetOptions> {

  transformModel(model: OmniModel, options: RealOptions<GenericTargetOptions>): void {

    if (!options.generifyTypes) {
      return;
    }

    const subTypeToSuperTypes = OmniUtil.getSuperTypeToSubTypesMap(model);

    const dependencySorter = Sorters.byDependencies(model);

    const superTypes = [...subTypeToSuperTypes.keys()].sort((a, b) => {
      const aSubType = (subTypeToSuperTypes.get(a) || [])[0];
      const bSubType = (subTypeToSuperTypes.get(b) || [])[0];
      return dependencySorter(aSubType, bSubType);
    });

    const propertyTypeToGenericTypeMap = new Map<OmniType, OmniType>();

    // TODO:
    // * extends JsonRpcRequest<GiveStringGetStringRequestParams> should be extends JsonRpcRequest<String, GiveStringGetStringRequestParams>
    //    - Is this because of a missed exploding of the parameters? Or because it is unknown? Need to fix! It should be exploded! But GenericTarget needs to be caught up!
    // * Check if the "explode" code is still needed (it probably is)

    for (const superType of superTypes) {

      if (superType.kind == OmniTypeKind.GENERIC_TARGET
        || superType.kind == OmniTypeKind.COMPOSITION
        || superType.kind == OmniTypeKind.ENUM) {
        continue;
      }

      if (superType.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {

        // TODO: Add later -- right now we don't know for sure if it is a type that can be made generic
        //        Need a "asSuperGenericType" in JavaUtil
        continue;
      }

      const subTypes = subTypeToSuperTypes.get(superType);
      if (!subTypes) {
        continue;
      }

      const commonProperties = PropertyUtil.getCommonProperties(
        EqualityLevel.FUNCTION_MIN,
        // We do not care *at all* if they have nothing in-common. But we try our best to get one.
        EqualityLevel.NOT_EQUAL_MIN,
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

          // There are 1 or less distinct types, so we should replace it with generics.
          continue;
        }

        const genericName = (Object.keys(commonProperties.byPropertyName).length == 1) ? 'T' : `T${Case.pascal(propertyName)}`;

        const lowerBound = this.toGenericBoundType(info.commonType, options);
        if (lowerBound) {
          const expandedGenericSourceIdentifier = this.expandLowerBoundGenericIfPossible(lowerBound, genericSource, options);
          if (expandedGenericSourceIdentifier) {
            propertyNameExpansions.set(propertyName, [expandedGenericSourceIdentifier]);
          }
        }

        const genericSourceIdentifier: OmniGenericSourceIdentifierType = {
          placeholderName: genericName,
          kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
          lowerBound: lowerBound,
        };
        genericSource.sourceIdentifiers.push(genericSourceIdentifier);

        const incorrectTypeCount = this.populateAllowedGenericTypes(info, options, propertyTypeToGenericTypeMap);
        if (incorrectTypeCount > 0) {
          logger.warn(`Skipping '${propertyName}' since some property types cannot be made generic`);
          continue;
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
              OmniUtil.swapType(model, superType, genericSource);
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
            type: propertyTypeToGenericTypeMap.get(property.type) || property.type,
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

  private populateAllowedGenericTypes(
    info: PropertyInformation,
    options: RealOptions<GenericTargetOptions>,
    propertyTypeToGenericTypeMap: Map<OmniType, OmniType>,
  ) {

    let incorrectTypeCount = 0;
    for (const property of info.properties) {

      const genericType = this.getAllowedGenericPropertyType(property.type, options);
      if (genericType == undefined) {
        incorrectTypeCount++;
        break;
      } else if (genericType != property.type) {
        propertyTypeToGenericTypeMap.set(property.type, genericType);
      }
    }

    return incorrectTypeCount;
  }

  private expandLowerBoundGenericIfPossible(
    lowerBound: OmniType,
    genericSource: OmniGenericSourceType,
    options: GenericTargetOptions,
  ): OmniGenericSourceIdentifierType | undefined {

    if (lowerBound.kind != OmniTypeKind.GENERIC_TARGET) {

      // We only expand the bound if it is a generic target
      return undefined;
    }

    if (lowerBound.targetIdentifiers.length != 1) {

      // For now we only support if there is one, for simplicity. Needs improvement in the future.
      return undefined;
    }

    // The property generic type is itself a generic target.
    // This can for example be: <T extends JsonRpcRequest<AbstractRequestParams>>
    // To make it better and more exact to work with, we should replace with this:
    // <TData extends AbstractRequestParams, T extends JsonRpcRequest<TData>>
    const targetIdentifier = lowerBound.targetIdentifiers[0];
    const sourceIdentifierLowerBound = this.toGenericBoundType(targetIdentifier.type, options);

    const sourceIdentifier: OmniGenericSourceIdentifierType = {
      placeholderName: this.getExplodedSourceIdentifierName(targetIdentifier.sourceIdentifier),
      kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
      lowerBound: sourceIdentifierLowerBound,
    };

    genericSource.sourceIdentifiers.push(sourceIdentifier);
    lowerBound.targetIdentifiers[0] = {
      kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
      type: sourceIdentifier,
      sourceIdentifier: sourceIdentifier,
    };

    return sourceIdentifier;
  }

  private toGenericBoundType(targetIdentifierType: OmniType | undefined, options: GenericTargetOptions): OmniType | undefined {

    const targetIdentifierGenericType = targetIdentifierType
      ? this.getAllowedGenericPropertyType(targetIdentifierType, options)
      : undefined;

    if (!targetIdentifierGenericType || targetIdentifierGenericType.kind == OmniTypeKind.UNKNOWN) {
      return undefined;
    }

    return targetIdentifierGenericType;
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

  private getAllowedGenericPropertyType(
    genericTargetType: OmniType,
    options: GenericTargetOptions,
  ): OmniType | undefined {

    if (!OmniUtil.isGenericAllowedType(genericTargetType)) {

      switch (options.onPrimitiveGenerification) {
        case PrimitiveGenerificationChoice.ABORT: {
          return undefined;
        }
        case PrimitiveGenerificationChoice.WRAP_OR_BOX:
        case PrimitiveGenerificationChoice.SPECIALIZE: {
          const allowedGenericTargetType = OmniUtil.toGenericAllowedType(
            genericTargetType,
            (options.onPrimitiveGenerification == PrimitiveGenerificationChoice.SPECIALIZE)
              ? OmniPrimitiveBoxMode.WRAP
              : OmniPrimitiveBoxMode.BOX,
          );
          allowedGenericTargetType.description = `Not allowed to be null`; // TODO: Internationalize

          const common = OmniUtil.getCommonDenominatorBetween(genericTargetType, allowedGenericTargetType, false)?.type;
          if (common != genericTargetType) {
            const from = OmniUtil.describe(genericTargetType);
            const to = OmniUtil.describe(allowedGenericTargetType);
            logger.debug(`Changing generic type from ${from} to ${to}`);
            genericTargetType = allowedGenericTargetType;
          }
          break;
        }
      }
    }

    return genericTargetType;
  }
}
