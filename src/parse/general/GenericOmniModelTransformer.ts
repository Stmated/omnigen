import {OmniModelTransformer} from '@parse/OmniModelTransformer';
import {
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniGenericTargetIdentifierType,
  OmniGenericTargetType,
  OmniModel,
  OmniObjectType,
  OmniProperty,
  OmniType,
  OmniTypeKind,
  TypeName
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
    // If many types have the exact same properties with the same names,
    // but the only thing differing are the types, then replace with generic source and target types.

    const allTypes = OmniModelUtil.getAllExportableTypes(model, model.types);

    // TODO: Need to sort the types so that the leaf types are done first
    //        Otherwise we will find the wrong types when doing the "find common denominator" stuff

    const signatureMap = new Map<string, SignatureInfo>();
    for (const type of allTypes.all) {

      if (type.kind == OmniTypeKind.OBJECT) {
        const extendedBy = type.extendedBy;
        if (extendedBy && extendedBy.kind == OmniTypeKind.OBJECT) {
          const t = type as OmniObjectTypeWithExtension;
          const propertyNames = type.properties.map(it => it.name).sort();
          // // TODO: Signature should contain "default value" if exists -- since it makes it unique
          // const propertyNames = type.properties.map(it => {
          //   let propertyIdentifier = it.name;
          //   if (it.type.kind == OmniTypeKind.PRIMITIVE) {
          //     if (it.type.valueConstant) {
          //       if (typeof it.type.valueConstant == 'function') {
          //         // TODO: Check if this actually works. Move this code into a util method does does 'is function' check
          //         propertyIdentifier += `[${String(it.type.valueConstant(it.type))}]`;
          //       } else {
          //         propertyIdentifier += `[${String(it.type.valueConstant)}]`;
          //       }
          //     }
          //   }
          //   return propertyIdentifier;
          // }).sort();
          const signature = `${propertyNames.join(',')},${OmniModelUtil.getTypeDescription(t.extendedBy)}`;

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
      // name: info.extendedBy.name,
      kind: OmniTypeKind.GENERIC_SOURCE,
      of: info.extendedBy,
      sourceIdentifiers: [],
    };

    const wrapPrimitives = (options.onPrimitiveGenerification == PrimitiveGenerificationChoice.SPECIALIZE);
    const genericPropertiesToAdd: OmniProperty[] = [];
    const propertyNameExpansions = new Map<string, OmniGenericSourceIdentifierType[]>();
    for (const propertyName of info.propertyNames) {
      const uniqueTypesOnIndex = this.getUniqueTypes(info, propertyName);

      if (uniqueTypesOnIndex.length <= 1) {

        // We only convert if there are more than 1 different types between the classes with the same signature.
        continue;
      }

      // TODO: There is a possibility that the generic identifiers could clash. We should suffix with numbers then.
      const genericName = (genericEntries.length == 0) ? 'T' : `T${pascalCase(propertyName)}`;
      const commonDenominator = JavaUtil.getCommonDenominator(...uniqueTypesOnIndex);
      const genericCommonDenominator = commonDenominator
        ? JavaUtil.toGenericAllowedType(commonDenominator, wrapPrimitives)
        : undefined;
      const lowerBound = (genericCommonDenominator?.kind == OmniTypeKind.UNKNOWN)
        ? undefined
        : genericCommonDenominator;

      if (lowerBound) {

        const expandedGenericSourceIdentifier = this.expandLowerBoundGenericIfPossible(lowerBound, genericSource);

        if (expandedGenericSourceIdentifier) {
          propertyNameExpansions.set(propertyName, [expandedGenericSourceIdentifier]);
        }
      }

      // Set the common denominator to the generic index.
      // The common denominator could be undefined, then it has no type constraints.
      const genericSourceIdentifier: OmniGenericSourceIdentifierType = {
        placeholderName: genericName,
        kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
        lowerBound: lowerBound,
      };

      genericSource.sourceIdentifiers.push(genericSourceIdentifier);

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

      const genericTarget: OmniGenericTargetType = {
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

        const genericTargetType = this.getAllowedGenericPropertyType(
          actualProperty.type,
          genericSource,
          subType,
          propertyName,
          options
        );

        if (genericTargetType == undefined) {
          return undefined;
        }

        const targetIdentifier: OmniGenericTargetIdentifierType = {
          kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
          type: genericTargetType,
          sourceIdentifier: generic.identifier
        };

        const expansions = propertyNameExpansions.get(propertyName);
        if (expansions && expansions.length > 0) {

          if (actualProperty.type.kind == OmniTypeKind.OBJECT) {
            if (actualProperty.type.extendedBy && actualProperty.type.extendedBy.kind == OmniTypeKind.GENERIC_TARGET) {

              // Let's expand the property's generic target identifiers into this current generic type.
              // TODO: This should probably be done recursively somehow, so any depth is handled.
              const targets = actualProperty.type.extendedBy.targetIdentifiers;
              genericTarget.targetIdentifiers.push(...targets);
            }
          }
        }

        genericTarget.targetIdentifiers.push(targetIdentifier);
      }

      if (genericTarget.targetIdentifiers.length == 0) {

        // For some reason we could not find any target identifiers.
        // Let's remove this type from removal and keep things as they are.
        logger.error(`Could not find any target identifiers for '${OmniModelUtil.getTypeDescription(subType)}'. This is odd.`);
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

  private expandLowerBoundGenericIfPossible(
    lowerBound: OmniType,
    genericSource: OmniGenericSourceType
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
    // To make it better and more exact to work with, we should replace with his:
    // <TData extends AbstractRequestParams, T extends JsonRpcRequest<TData>>
    const targetIdentifier = lowerBound.targetIdentifiers[0];
    const sourceIdentifier: OmniGenericSourceIdentifierType = {
      // TODO: The name should be automatically figure out somehow, unless specified in spec
      //        Right now the name usually becomes 'TT' and easily clashes
      placeholderName: this.getExplodedSourceIdentifierName(targetIdentifier.sourceIdentifier),
      kind: OmniTypeKind.GENERIC_SOURCE_IDENTIFIER,
      lowerBound: targetIdentifier.type,
    };

    genericSource.sourceIdentifiers.push(sourceIdentifier);
    lowerBound.targetIdentifiers[0] = {
      kind: OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
      type: sourceIdentifier,
      sourceIdentifier: sourceIdentifier
    };

    return sourceIdentifier;
  }

  private getExplodedSourceIdentifierName(identifier: OmniGenericSourceIdentifierType): string {

    if (identifier.lowerBound) {

      // TODO: This needs to be improved someday. It should be based on the property name, and not guessed from type.
      const lowerName = Naming.safe(OmniModelUtil.getVirtualTypeName(identifier.lowerBound));
      // Naming.safer(identifier.lowerBound, fn);
      const words = lowerName.split(/(?=[A-Z])/);
      if (words.length > 2) {
        return `T${words[words.length - 2]}${words[words.length - 1]}`;
      } else if (words.length > 1) {
        return `T${words[words.length - 1]}`;
      }
    }

    // const actualName = ; // Naming.safer(identifier, fn);
    return `TExploded${identifier.placeholderName}`;
  }

  private removeStaticTypePropertyFromSubType(
    info: SignatureInfo,
    sourceIdentifierAndPropertyNames: SourceIdentifierAndPropertyName[]
  ): void {

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
      if (!property) {
        throw new Error(`The property did not exist`);
      }

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

  private getAllowedGenericPropertyType(
    genericTargetType: OmniType,
    genericSource: OmniGenericSourceType,
    subType: OmniObjectTypeWithExtension,
    propertyName: string,
    options: JavaOptions
  ): OmniType | undefined {

    if (!JavaUtil.isGenericAllowedType(genericTargetType)) {

      switch (options.onPrimitiveGenerification) {
        case PrimitiveGenerificationChoice.ABORT:
          const targetName = OmniModelUtil.getTypeDescription(genericSource);
          const ownerName = OmniModelUtil.getTypeDescription(subType);
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

          const common = JavaUtil.getCommonDenominatorBetween(genericTargetType, allowedGenericTargetType);
          if (common != genericTargetType) {
            const from = OmniModelUtil.getTypeDescription(genericTargetType);
            const to = OmniModelUtil.getTypeDescription(allowedGenericTargetType);
            logger.debug(`Changing generic type from ${from} (${genericTargetType.kind}) to ${to} (${allowedGenericTargetType.kind})`);
            genericTargetType = allowedGenericTargetType;
          }
          break;
      }
    }

    // TODO: Replace with multiple return points instead of replacing variable
    return genericTargetType;
  }
}
