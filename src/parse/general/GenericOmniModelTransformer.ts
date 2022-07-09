import {OmniModelTransformer} from '@parse/OmniModelTransformer';
import {
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniGenericTargetType,
  OmniModel,
  OmniObjectType,
  OmniType,
  OmniTypeKind
} from '@parse';
import {Naming} from '@parse/Naming';
import {JavaOptions, JavaUtil} from '@java';
import {OmniModelUtil} from '@parse/OmniModelUtil';
import {LoggerFactory} from '@util';

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

  transform(model: OmniModel, options: JavaOptions): void {

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
      const newType = this.handleSignatureInfo(e[1]);
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

  private handleSignatureInfo(info: SignatureInfo): OmniGenericSourceType | undefined {

    const genericTargets: OmniGenericTargetType[] = [];
    const genericEntries: SourceIdentifierAndPropertyName[] = [];

    const genericSource: OmniGenericSourceType = {
      // TODO: There should not be a name here, it should always be the name of the inner class
      name: info.extendedBy.name,
      kind: OmniTypeKind.GENERIC_SOURCE,
      of: info.extendedBy,
      sourceIdentifiers: [],
    }

    for (const propertyName of info.propertyNames) {
      const uniqueTypesOnIndex = this.getUniqueTypes(info, propertyName);

      if (uniqueTypesOnIndex.length <= 1) {

        // We only convert if there are more than 1 different types between the classes with the same signature.
        continue;
      }

      const genericName = (genericEntries.length == 0) ? 'T' : `T${genericEntries.length}`;
      const commonDenominator = JavaUtil.getCommonDenominator(...uniqueTypesOnIndex);

      // Set the common denominator to the generic index.
      // The common denominator could be undefined, then it has no type constraints.
      const genericSourceIdentifier: OmniGenericSourceIdentifierType = {
        name: genericName,
        kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
        lowerBound: (commonDenominator?.kind == OmniTypeKind.UNKNOWN) ? undefined : commonDenominator,
      };

      genericSource.sourceIdentifiers.push(genericSourceIdentifier);

      // TODO: This property should be removed from this type and moved to the type we are extending from.
      genericEntries.push({
        identifier: genericSourceIdentifier,
        propertyName: propertyName,
      });

      // Is this the best way of doing it? Placing a generic property inside the original type?
      genericSource.of.properties.push({
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
    for (const subType of info.subTypes) {

      const genericTarget: OmniGenericTargetType = {
        name: subType.extendedBy.name,
        kind: OmniTypeKind.GENERIC_TARGET,
        source: genericSource,
        targetIdentifiers: [],
      };

      genericTargets.push(genericTarget);

      // For each type, re-make it into a GenericTarget based on the entries found
      for (const propertyName of info.propertyNames) {
        const actualProperty = subType.properties.find(it => it.name == propertyName);
        if (!actualProperty) {
          throw new Error(`The property was not found`);
        }

        const generic = genericEntries.find(it => it.propertyName == propertyName);
        if (generic) {
          genericTarget.targetIdentifiers.push({
            name: `GenericTargetTo${propertyName}`,
            kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
            type: actualProperty.type,
            sourceIdentifier: generic.identifier
          });
        }
      }

      if(genericTarget.targetIdentifiers.length == 0) {

        // For some reason we could not find any target identifiers.
        // Let's remove this type from removal and keep things as they are.
        logger.error(`Could not find any target identifiers for ${Naming.unwrap(subType.name)}. This is odd.`);
        subTypesToRemove.push(subType);
      } else {

        // We should now replace the type this classType is extended by.
        // We replace it with a generic target to the generic source.
        subType.extendedBy = genericTarget;
      }
    }

    if (subTypesToRemove.length > 0) {
      info.subTypes = info.subTypes.filter(it => !subTypesToRemove.includes(it));
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
