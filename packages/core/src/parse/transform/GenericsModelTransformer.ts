import {
  ModelTransformOptions,
  OmniExternalModelReferenceType,
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniGenericTargetIdentifierType,
  OmniGenericTargetType, OmniItemKind,
  OmniModel,
  OmniModel2ndPassTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniModelTransformerArgs, OmniObjectType,
  OmniProperty,
  OmniPropertyOwner,
  OmniSubTypeCapableType,
  OmniSuperGenericTypeCapableType,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  PropertiesInformation,
  PropertyInformation,
  TargetFeatures,
  TypeDiffKind,
} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {PropertyUtil} from '../PropertyUtil.ts';
import {OmniUtil} from '../OmniUtil.ts';
import {Case, CreateMode, isDefined, Sorters} from '../../util';
import {Naming} from '../Naming.ts';
import {OmniReducer} from '../OmniReducer.ts';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Takes an OmniModel, and tries to modify it to use generics where possible.
 * This will remove the need for a lot of extra types, and make code more readable.
 */
export class GenericsModelTransformer implements OmniModel2ndPassTransformer {

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs): void {
    this.transform(args, args.targetFeatures);
  }

  private transform(args: OmniModelTransformerArgs, targetFeatures: TargetFeatures) {
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

      if (superType.kind === OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {

        // Maybe external model reference could in the future -- or it will be removed in favor of normalizing all referenced documents, and remove the type kind
        continue;
      }

      const subTypes = superTypeToSubTypes.get(superType);
      if (!subTypes) {
        continue;
      }

      args.model = this.attemptHoistToSuperType(superType, subTypes, sourceToTargets, args.model, args.options, targetFeatures);
    }
  }

  private attemptHoistToSuperType(
    superType: Exclude<OmniSuperGenericTypeCapableType, OmniExternalModelReferenceType>,
    subTypes: OmniSubTypeCapableType[],
    sourceToTargets: Map<OmniGenericSourceType, OmniGenericTargetType[]>,
    model: OmniModel,
    options: ModelTransformOptions,
    features: TargetFeatures,
  ): OmniModel {

    const commonProperties = PropertyUtil.getCommonProperties(
      // We do not care *at all* if they have nothing in-common. Just nice if get one.
      () => false,
      () => false,
      features,
      {create: CreateMode.SIMPLE},
      ...subTypes,
    );

    const genericSource: OmniGenericSourceType<typeof superType> = {
      kind: OmniTypeKind.GENERIC_SOURCE,
      of: superType,
      sourceIdentifiers: [],
    };

    const ownerToGenericTargetMap = new Map<OmniPropertyOwner, OmniGenericTargetType>();
    for (const propertyName in commonProperties.byPropertyName) {
      if (!(propertyName in commonProperties.byPropertyName)) {
        continue;
      }

      const info = commonProperties.byPropertyName[propertyName];
      if (info.distinctTypes.length <= 1) {

        // There are 1 or less distinct types, so we will not replace it with generics.
        continue;
      }

      if (info.typeDiffs?.includes(TypeDiffKind.POLYMORPHIC_LITERAL) && !features.literalTypes && info.distinctTypes.some(it => OmniUtil.isPrimitive(it) ? it.literal : false)) {
        continue;
      }

      model = this.attemptHoistPropertyToGeneric(
        superType,
        genericSource,
        commonProperties,
        info,
        ownerToGenericTargetMap,
        sourceToTargets,
        model,
        options,
        features,
      );
    }

    return model;
  }

  private attemptHoistPropertyToGeneric(
    superType: OmniSuperTypeCapableType,
    genericSource: OmniGenericSourceType,
    commonProperties: PropertiesInformation,
    info: PropertyInformation,
    ownerToGenericTargetMap: Map<OmniPropertyOwner, OmniGenericTargetType>,
    sourceToTargets: Map<OmniGenericSourceType, OmniGenericTargetType[]>,
    model: OmniModel,
    options: ModelTransformOptions,
    features: TargetFeatures,
  ): OmniModel {

    const genericName = (Object.keys(commonProperties.byPropertyName).length == 1) ? 'T' : `T${Case.pascal(info.propertyName)}`;

    const upperBound = this.toGenericUpperBoundType(info, features);

    const genericSourceIdentifier: OmniGenericSourceIdentifierType = {
      kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
      placeholderName: genericName,
    };

    this.maybeWildcardUpperBound(upperBound, genericSource, info.propertyName);

    if (upperBound) {
      logger.info(`Setting upperBound for ${OmniUtil.describe(genericSourceIdentifier)} for ${OmniUtil.describe(genericSource)}`);
      genericSourceIdentifier.upperBound = upperBound;
    }

    genericSource.sourceIdentifiers.push(genericSourceIdentifier);

    if (!options.generificationBoxAllowed) {
      if (info.properties.map(it => it.type).find(it => !OmniUtil.isGenericAllowedType(it))) {
        logger.warn(`Skipping '${info.propertyName}' since some property types cannot be made generic`);
        return model;
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

          // TODO: This does not work, since we rebuild the whole model for every iteration, so the target identifiers are added to a dead model!
          // TODO: Need to rethink the whole generic functionality to make it work the new reducers, to do all things in proper passes.
          // const reducer = new DefaultOmniReducerDispatcher({
          //   ANY: n => {
          //     if (n === superType) {
          //       return genericSource;
          //     }
          //
          //     return undefined;
          //   },
          //   OBJECT: (n, a) => {
          //
          //     const extendedBy = n.extendedBy ? a.dispatcher.reduce(n.extendedBy) : undefined;
          //     let extendedSuper: OmniSuperTypeCapableType | undefined;
          //     if (extendedBy) {
          //       if (!OmniUtil.asSuperType(extendedBy)) {
          //         logger.warn(`Cannot replace '${OmniUtil.describe(n.extendedBy)}' with '${OmniUtil.describe(extendedBy)}' since it is not a valid supertype`);
          //       } else {
          //         extendedSuper = extendedBy;
          //       }
          //     }
          //
          //     return {
          //       ...n,
          //       properties: n.properties.map(it => a.dispatcher.reduce(it)).filter(isDefined),
          //       extendedBy: extendedSuper,
          //     } satisfies OmniObjectType;
          //   },
          // });
          //
          // model = reducer.reduce(model);

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

      const targetIdentifier: OmniGenericTargetIdentifierType = {
        kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
        type: property.type,
        sourceIdentifier: genericSourceIdentifier,
      };
      genericTarget.targetIdentifiers.push(targetIdentifier);

      // Remove the non-generic property from the original property owner.
      const idx = property.owner.properties.indexOf(property);
      if (idx == -1) {
        throw new Error(`Could not find property '${OmniUtil.getPropertyNameOrPattern(property.name)}' in owner ${OmniUtil.describe(property.owner)}, something is wrong with the generic hoisting`);
      }

      property.owner.properties.splice(idx, 1);
    }

    if (genericSource.of.kind === OmniTypeKind.OBJECT) {

      const newProperty: OmniProperty = {
        kind: OmniItemKind.PROPERTY,
        name: info.propertyName,
        type: genericSourceIdentifier,
        owner: genericSource.of,
        debug: OmniUtil.addDebug(
          info.properties.flatMap(it => {
            const debug = it.debug || [];
            const debugArray = (typeof debug === 'string') ? [debug] : debug;
            return debugArray.map(d => `${Naming.getNameString(it.owner)}: ${d}`);
          }),
          `Merged into one generic property`,
        ),
      };

      if (info.properties.every(it => it.readOnly)) {
        newProperty.readOnly = true;
      }
      if (info.properties.every(it => it.writeOnly)) {
        newProperty.writeOnly = true;
      }
      if (info.properties.every(it => it.required)) {
        newProperty.required = true;
      }
      if (info.properties.every(it => it.deprecated)) {
        newProperty.deprecated = true;
      }
      if (info.properties.every(it => it.abstract)) {
        newProperty.abstract = true;
      }

      const existing = genericSource.of.properties.find(it => it.name === newProperty.name);
      if (existing) {

        logger.warn(`Encountered property '${existing.name}' attempted to be added twice, which is unexpected behavior. Replacing with generic version.`);
        const existingIndex = genericSource.of.properties.indexOf(existing);
        genericSource.of.properties.splice(existingIndex, 1, newProperty);

      } else {
        genericSource.of.properties.push(newProperty);
      }
    } else {

      // Go back to info logging? Feels like this should have been filtered away earlier!
      throw new Error(`Encountered ${OmniUtil.describe(genericSource.of)} as generic source, which cannot represent properties, so cannot move ${info.propertyName} there`);
    }

    return model;
  }

  /**
   * from: `class A extends B<C<D>>`
   * into: `class A extends B<? extends C<? extends D>>`
   *
   * Making it possible for languages to let subtypes of given generic argument to be used.
   * Some target languages might remove/simplify this in some other transformer, since that it their default.
   */
  private maybeWildcardUpperBound(
    upperBound: OmniType | undefined,
    genericSource: OmniGenericSourceType,
    propertyName: string,
  ): void {

    if (!upperBound || upperBound.kind !== OmniTypeKind.GENERIC_TARGET) {
      return;
    }

    for (let i = 0; i < upperBound.targetIdentifiers.length; i++) {
      const lowerTarget = upperBound.targetIdentifiers[i];

      if (!OmniUtil.asSuperType(lowerTarget.type)) {
        continue;
      }

      if (OmniUtil.isPrimitive(lowerTarget.type)) {

        // Creating generics like `? extends String` does not make much sense, though legal.
        continue;
      }

      logger.debug(
        `Creating unknown with upperBound (${OmniUtil.describe(lowerTarget.type)})
        for property='${propertyName}'
        upperBound='${OmniUtil.describe(upperBound)}'
        genericSource='${OmniUtil.describe(genericSource)}'`,
      );

      this.maybeWildcardUpperBound(lowerTarget.type, genericSource, propertyName);

      upperBound.targetIdentifiers[i] = {
        ...lowerTarget,
        type: {
          kind: OmniTypeKind.UNKNOWN,
          upperBound: lowerTarget.type,
          debug: OmniUtil.addDebug(lowerTarget.type.debug, `To unknown type with upper bound`),
        },
        debug: OmniUtil.addDebug(lowerTarget.debug, `To unknown with upper bound`),
      };
    }
  }

  private toGenericUpperBoundType(info: PropertyInformation, features: TargetFeatures): OmniType | undefined {

    if (info.commonType.kind == OmniTypeKind.UNKNOWN) {
      return undefined;
    }

    // /*&& !features.literalTypes && info.distinctTypes.some(it => OmniUtil.isPrimitive(it) ? it.literal : false)/*
    if (info.typeDiffs?.includes(TypeDiffKind.FUNDAMENTAL_TYPE)) {

      // If the type difference is fundamental, then we cannot have an upper bound set, since some have nothing in-common.
      return undefined;
    }

    return info.commonType;
  }
}
