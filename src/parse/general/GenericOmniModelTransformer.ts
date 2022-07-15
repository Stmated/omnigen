import {OmniModelTransformer} from '@parse/OmniModelTransformer';
import {
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniGenericTargetType,
  OmniModel,
  OmniObjectType,
  OmniProperty,
  OmniType,
  OmniTypeKind
} from '@parse';
import {Naming} from '@parse/Naming';
import {JavaOptions, JavaUtil, PrimitiveGenerificationChoice} from '@java';
import {OmniModelUtil} from '@parse/OmniModelUtil';
import {LoggerFactory} from '@util';
import {pascalCase} from 'change-case';

export const logger = LoggerFactory.create(__filename);

interface SignatureInfo {
  subTypes: OmniObjectTypeWithExtension[];
  extendedBy: OmniObjectType;
  propertyNames: string[];
}

interface SourceIdentifierAndPropertyName {
  identifier: OmniGenericSourceIdentifierType;
  propertyName: string;
}

type OmniObjectTypeWithExtension = Omit<OmniObjectType, 'extendedBy'> & Required<Pick<OmniObjectType, 'extendedBy'>>;

/**
 * Takes an OmniModel, and tries to modify it to use generics where possible.
 * This will remove the need for a lot of extra types, and make code more readable.
 */
export class GenericOmniModelTransformer implements OmniModelTransformer<JavaOptions> {

  transformModel(model: OmniModel, options: JavaOptions): void {

    // Go through all types.
    // If many types have the exact same properties with the same names
    // But if the only thing differing are the types, then replace with generic source and target types.

    const allTypes = OmniModelUtil.getAllExportableTypes(model, model.types);
    const signatureMap = new Map<string, SignatureInfo>();
    for (const type of allTypes.all) {

      if (type.kind == OmniTypeKind.OBJECT) {
        const extendedBy = type.extendedBy;
        if (extendedBy && extendedBy.kind == OmniTypeKind.OBJECT) {
          const t = type as OmniObjectTypeWithExtension;
          const propertyNames = type.properties.map(it => it.name).sort();
          const signature = `${propertyNames.join(',')},${Naming.safer(t.extendedBy)}`;

          let types = signatureMap.get(signature);
          if (!types) {
            signatureMap.set(signature, types = {
              subTypes: [],
              extendedBy: extendedBy,
              propertyNames: propertyNames
            });
          }

          types.subTypes.push(t);
        }
      }
    }

    for (const e of signatureMap.entries()) {

      let isUsedByOtherSignatureCount = 0;
      for (const otherInfo of signatureMap.values()) {
        if (otherInfo.extendedBy == e[1].extendedBy) {
          isUsedByOtherSignatureCount++;
          if (isUsedByOtherSignatureCount > 1) {
            break;
          }
        }
      }

      if (isUsedByOtherSignatureCount > 1) {
        continue;
      }

      // This could be a class that we can generify.
      // Need to investigate the properties and see if the types are different.
      const newType = this.handleSignatureInfo(e[1], options);
      if (newType) {
        const idx = model.types.indexOf(newType.of);
        if (idx !== -1) {
          // Remove the type from the type list, since only the wrapper should be public.
          model.types.splice(idx, 1);
        }

        model.types.splice(idx, 0, newType);
      }
    }
  }

  private handleSignatureInfo(info: SignatureInfo, options: JavaOptions): OmniGenericSourceType | undefined {

    const genericEntries: SourceIdentifierAndPropertyName[] = [];

    const genericSource: OmniGenericSourceType = {
      // TODO: There should not be a name here, it should always be the name of the inner class
      name: (duplicateFn) => `Source${Naming.safer(info.extendedBy, duplicateFn)}`,
      kind: OmniTypeKind.GENERIC_SOURCE,
      of: info.extendedBy,
      sourceIdentifiers: [],
    }

    const wrapPrimitives = (options.onPrimitiveGenerification == PrimitiveGenerificationChoice.SPECIALIZE);
    const genericPropertiesToAdd: OmniProperty[] = [];
    for (const propertyName of info.propertyNames) {
      const uniqueTypesOnIndex = this.getUniqueTypes(info, propertyName);

      if (uniqueTypesOnIndex.length <= 1) {

        // We only convert if there are more than 1 different types between the classes with the same signature.
        continue;
      }

      const genericName = (genericEntries.length == 0) ? 'T' : `T${genericEntries.length}`;
      const commonDenominator = JavaUtil.getCommonDenominator(...uniqueTypesOnIndex);
      const genericCommonDenominator = commonDenominator
        ? JavaUtil.toGenericAllowedType(commonDenominator, wrapPrimitives)
        : undefined;
      const lowerBound = (genericCommonDenominator?.kind == OmniTypeKind.UNKNOWN)
        ? undefined
        : genericCommonDenominator;

      // Set the common denominator to the generic index.
      // The common denominator could be undefined, then it has no type constraints.
      const genericSourceIdentifier: OmniGenericSourceIdentifierType = {
        name: genericName,
        kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
        lowerBound: lowerBound,
      };

      genericSource.sourceIdentifiers.push(genericSourceIdentifier);

      // TODO: This property should be removed from this type and moved to the type we are extending from.
      genericEntries.push({
        identifier: genericSourceIdentifier,
        propertyName: propertyName,
      });

      // Is this the best way of doing it? Placing a generic property inside the original type?
      genericPropertiesToAdd.push({
        name: propertyName,
        type: genericSourceIdentifier,
        owner: genericSource.of
      });
    }

    if (genericEntries.length == 0) {
      // There were no generic entries found for this type.
      // It simply is not one that has any common properties of differing types.
      return undefined;
    }

    const subTypesToRemove: OmniType[] = [];
    const extensionsToSet: { target: OmniObjectType, extension: OmniType }[] = [];
    for (const subType of info.subTypes) {

      const originalExtension = subType.extendedBy;
      const genericTarget: OmniGenericTargetType = {
        name: () => `${Naming.safer(originalExtension)}For${Naming.safer(subType)}`,
        kind: OmniTypeKind.GENERIC_TARGET,
        source: genericSource,
        targetIdentifiers: [],
      };

      // For each type, re-make it into a GenericTarget based on the entries found
      for (const propertyName of info.propertyNames) {
        const actualProperty = subType.properties.find(it => it.name == propertyName);
        if (!actualProperty) {
          throw new Error(`The property was not found`);
        }

        const generic = genericEntries.find(it => it.propertyName == propertyName);
        if (!generic) {
          continue;
        }

        let genericTargetType = actualProperty.type;
        if (!JavaUtil.isGenericAllowedType(genericTargetType)) {

          switch (options.onPrimitiveGenerification) {
            case PrimitiveGenerificationChoice.ABORT:
              const targetName = Naming.safer(genericSource);
              const ownerName = Naming.safer(subType);
              logger.warn(
                `Aborting generification of ${targetName}', since '${ownerName}' has primitive non-null property '${propertyName}'`
              );
              return undefined;
            case PrimitiveGenerificationChoice.WRAP_OR_BOX:
            case PrimitiveGenerificationChoice.SPECIALIZE:
              const allowedGenericTargetType = JavaUtil.toGenericAllowedType(
                genericTargetType,
                (options.onPrimitiveGenerification == PrimitiveGenerificationChoice.SPECIALIZE)
              );
              allowedGenericTargetType.description = `Not allowed to be null`; // TODO: Internationalize

              const from = Naming.safer(genericTargetType);
              const to = Naming.safer(allowedGenericTargetType);
              logger.warn(`Changing generic type from ${from} to ${to}`);
              genericTargetType = allowedGenericTargetType;
              break;
          }
        }

        genericTarget.targetIdentifiers.push({
          name: `GenericTargetFor${Naming.safer(subType)}${pascalCase(propertyName)}`,
          kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
          type: genericTargetType,
          sourceIdentifier: generic.identifier
        });
      }

      if (genericTarget.targetIdentifiers.length == 0) {

        // For some reason we could not find any target identifiers.
        // Let's remove this type from removal and keep things as they are.
        logger.error(`Could not find any target identifiers for ${Naming.unwrap(subType.name)}. This is odd.`);
        subTypesToRemove.push(subType);
      } else {

        // We should now replace the type this classType is extended by.
        // We replace it with a generic target to the generic source.
        extensionsToSet.push({
          target: subType,
          extension: genericTarget
        });
      }
    }

    // The actual mutation of the original types are done here at the end.
    // This is because it might have been aborted because of a partial error.
    if (subTypesToRemove.length > 0) {
      info.subTypes = info.subTypes.filter(it => !subTypesToRemove.includes(it));
    }

    for (const extensionToSet of extensionsToSet) {
      extensionToSet.target.extendedBy = extensionToSet.extension;
    }

    for (const sourceProperty of genericPropertiesToAdd) {
      genericSource.of.properties.push(sourceProperty);
    }

    // Remove the properties from the subtypes, since the generic property now exists in the supertype.
    this.removeStaticTypePropertyFromSubType(info, genericEntries);

    return genericSource;
  }

  private removeStaticTypePropertyFromSubType(info: SignatureInfo, sourceIdentifierAndPropertyNames: SourceIdentifierAndPropertyName[]): void {

    for (const classType of info.subTypes) {
      for (const propertyName of info.propertyNames) {
        const generic = sourceIdentifierAndPropertyNames.find(it => it.propertyName == propertyName);
        if (generic) {
          const idx = classType.properties.findIndex(it => it.name == propertyName);
          if (idx != -1) {
            classType.properties.splice(idx, 1);
          } else {
            throw new Error(`There was no property into the original class type`);
          }
        }
      }
    }
  }

  private getUniqueTypes(info: SignatureInfo, propertyName: string): OmniType[] {

    const propertyTypes: OmniType[] = [];
    for (const classType of info.subTypes) {
      const property = classType.properties.find(it => it.name == propertyName);
      if (!property) throw new Error(`The property did not exist`);

      const sameType = propertyTypes.find(it => {
        const common = JavaUtil.getCommonDenominatorBetween(property.type, it);

        // If the output is the exact same as the first input, then the two types are the same.
        return common == property.type;
      });

      if (!sameType) {
        propertyTypes.push(property.type);
      }
    }

    return propertyTypes;
  }
}
