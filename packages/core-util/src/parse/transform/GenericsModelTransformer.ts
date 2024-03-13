import {
  ModelTransformOptions,
  OMNI_GENERIC_FEATURES,
  OmniExternalModelReferenceType,
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniGenericTargetIdentifierType,
  OmniGenericTargetType,
  OmniModel,
  OmniModelTransformer,
  OmniModelTransformerArgs,
  OmniPropertyOwner,
  OmniSubTypeCapableType,
  OmniSuperGenericTypeCapableType,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  ParserOptions,
  PropertiesInformation,
  PropertyDifference,
  PropertyInformation,
} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';
import {PropertyUtil} from '../PropertyUtil.ts';
import {OmniUtil} from '../OmniUtil.ts';
import {EqualityFinder} from '../../equality';
import {Naming} from '../Naming.ts';
import {Case, Sorters} from '../../util';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Takes an OmniModel, and tries to modify it to use generics where possible.
 * This will remove the need for a lot of extra types, and make code more readable.
 */
export class GenericsModelTransformer implements OmniModelTransformer {

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

    const sourceToTargets = new Map<OmniGenericSourceType, OmniGenericTargetType[]>();

    for (const superType of superTypes) {

      if (!OmniUtil.isGenericSuperType(superType)) {
        continue;
      }

      if (superType.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {

        // Maybe external model reference could in the future -- or it will be removed in favor of normalizing all referenced documents, and remove the type kind
        continue;
      }

      const subTypes = superTypeToSubTypes.get(superType);
      if (!subTypes) {
        continue;
      }

      this.attemptHoistToSuperType(superType, subTypes, sourceToTargets, args.model, args.options);
    }
  }

  private attemptHoistToSuperType(
    superType: Exclude<OmniSuperGenericTypeCapableType, OmniExternalModelReferenceType>,
    subTypes: OmniSubTypeCapableType[],
    sourceToTargets: Map<OmniGenericSourceType, OmniGenericTargetType[]>,
    model: OmniModel,
    options: ModelTransformOptions,
  ) {

    const commonProperties = PropertyUtil.getCommonProperties(
      // We do not care *at all* if they have nothing in-common. Just nice if get one.
      () => false,
      pdiff => EqualityFinder.matchesPropDiff(pdiff, PropertyDifference.META),

      OMNI_GENERIC_FEATURES,
      ...subTypes,
    );

    const genericSource: OmniGenericSourceType<typeof superType> = {
      kind: OmniTypeKind.GENERIC_SOURCE,
      of: superType,
      sourceIdentifiers: [],
    };

    const ownerToGenericTargetMap = new Map<OmniPropertyOwner, OmniGenericTargetType>();
    const propertyNameExpansions = new Map<string, OmniGenericSourceIdentifierType[]>();
    for (const propertyName in commonProperties.byPropertyName) {
      if (!(propertyName in commonProperties.byPropertyName)) {
        continue;
      }

      const info = commonProperties.byPropertyName[propertyName];

      if (info.distinctTypes.length <= 1) {

        // There are 1 or less distinct types, so we will not replace it with generics.
        continue;
      }

      this.attemptHoistPropertyToGeneric(
        superType,
        genericSource,
        commonProperties,
        info,
        ownerToGenericTargetMap,
        propertyNameExpansions,
        sourceToTargets,
        model,
        options,
      );
    }
  }

  private attemptHoistPropertyToGeneric(
    superType: OmniSuperTypeCapableType,
    genericSource: OmniGenericSourceType,
    commonProperties: PropertiesInformation,
    info: PropertyInformation,
    ownerToGenericTargetMap: Map<OmniPropertyOwner, OmniGenericTargetType>,
    propertyNameExpansions: Map<string, OmniGenericSourceIdentifierType[]>,
    sourceToTargets: Map<OmniGenericSourceType, OmniGenericTargetType[]>,
    model: OmniModel,
    options: ModelTransformOptions,
  ): void {

    const genericName = (Object.keys(commonProperties.byPropertyName).length == 1) ? 'T' : `T${Case.pascal(info.propertyName)}`;

    const lowerBound = this.toGenericBoundType(info.commonType);
    // if (lowerBound) {
    //   if (expandedGenericSourceIdentifier) {
    //     propertyNameExpansions.set(info.propertyName, [expandedGenericSourceIdentifier]);
    //   }
    // }

    const genericSourceIdentifier: OmniGenericSourceIdentifierType = {
      kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
      placeholderName: genericName,
    };

    if (lowerBound && lowerBound.kind == OmniTypeKind.GENERIC_TARGET) {

      for (let i = 0; i < lowerBound.targetIdentifiers.length; i++) {
        const lowerTarget = lowerBound.targetIdentifiers[i];
        if (!OmniUtil.asSuperType(lowerTarget.type)) { // lowerTarget.type.kind == OmniTypeKind.UNKNOWN) {
          continue;
        }
        if (lowerTarget.type.kind == OmniTypeKind.PRIMITIVE) {

          // Creating generics like `? extends String` does not make much sense, though legal.
          continue;
        }

        lowerBound.targetIdentifiers[i] = {
          ...lowerTarget,
          type: {
            kind: OmniTypeKind.UNKNOWN,
            lowerBound: {...lowerTarget.type}, // This should maybe clone instead
          },
        };
      }
    }

    if (lowerBound) {
      genericSourceIdentifier.lowerBound = lowerBound;
    }

    // let targetIdentifierType: OmniType | undefined; // property.type
    // if (genericSource.of.kind == OmniTypeKind.GENERIC_TARGET) {
    //
    //   let i = 0;
    //   logger.info(`Hello`);
    //   let newTargetIdentifier: OmniGenericTargetType | undefined = undefined;
    //   // for (const nestedTarget of property.type.targetIdentifiers) {
    //   //
    //   //   if (ownerToGenericTargetMap.has(nestedTarget.type) || (nestedTarget.type.kind == OmniTypeKind.OBJECT && nestedTarget.type.abstract)) {
    //   //
    //   //     if (newTargetIdentifier === undefined) {
    //   //
    //   //       // Copy the target identifier so it is a new instance and not related to the previous.
    //   //       // property.type
    //   //       newTargetIdentifier = {
    //   //         ...property.type,
    //   //       };
    //   //     }
    //   //
    //   //     // Now we can work with our specialized target type.
    //   //     newTargetIdentifier.targetIdentifiers
    //   //   }
    //   // }
    //
    //   targetIdentifierType = newTargetIdentifier ?? property.type;
    // } else {
    //   targetIdentifierType = property.type;
    // }

    genericSource.sourceIdentifiers.push(genericSourceIdentifier);

    if (!options.generificationBoxAllowed) {
      if (info.properties.map(it => it.type).find(it => !OmniUtil.isGenericAllowedType(it))) {
        logger.warn(`Skipping '${info.propertyName}' since some property types cannot be made generic`);
        return;
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

        let targets = sourceToTargets.get(genericSource);
        if (!targets) {
          targets = [];
          sourceToTargets.set(genericSource, targets);
        }
        targets.push(genericTarget);

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
      // const expandedGenericSourceIdentifier = this.expandLowerBoundGenericIfRequired(
      //   property.type,
      //   genericSource,
      // );

      // if (expandedGenericSourceIdentifier) {
      //   let i = 0;
      // }

      // const expansions = propertyNameExpansions.get(info.propertyName);
      // if (expansions && expansions.length > 0 && property.type.kind == OmniTypeKind.OBJECT && property.type.extendedBy && property.type.extendedBy.kind == OmniTypeKind.GENERIC_TARGET) {
      //
      //   // Let's expand the property's generic target identifiers into this current generic type.
      //   // TODO: This should probably be done recursively somehow, so any depth is handled.
      //   const targets = property.type.extendedBy.targetIdentifiers;
      //   genericTarget.targetIdentifiers.push(...targets);
      // }

      const targetIdentifier: OmniGenericTargetIdentifierType = {
        kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
        type: property.type,
        sourceIdentifier: genericSourceIdentifier,
      };
      genericTarget.targetIdentifiers.push(targetIdentifier);

      // Remove the now generic property from the original property owner.
      const idx = property.owner.properties.indexOf(property);
      if (idx == -1) {
        throw new Error(`Could not find property '${property.name}' in owner ${OmniUtil.describe(property.owner)}, something is wrong with the generic hoisting`);
      }

      property.owner.properties.splice(idx, 1);
    }

    if (genericSource.of.kind == OmniTypeKind.OBJECT) {
      genericSource.of.properties.push({
        name: info.propertyName,
        type: genericSourceIdentifier,
        owner: genericSource.of,
      });
    } else {

      // Go back to info logging? Feels like this should have been filtered away earlier!
      throw new Error(`Encountered ${OmniUtil.describe(genericSource.of)} as generic source, which cannot represent properties, so cannot move ${info.propertyName} there`);
    }
  }

  private expandLowerBoundGenericIfRequired(
    lowerBound: OmniType,
    genericSource: OmniGenericSourceType,
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
    const sourceIdentifierLowerBound = this.toGenericBoundType(targetIdentifier.type); // , args, targetFeatures);

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

  private toGenericBoundType(targetIdentifierType: OmniType | undefined): OmniType | undefined {

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
