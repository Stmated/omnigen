import {
  OmniExternalModelReferenceType,
  OmniModel,
  OmniModelParserResult,
  OmniObjectType,
  OmniProperty,
  OmniType,
  OmniTypeKind
} from '@parse/OmniModel';
import {OmniUtil} from '@parse/OmniUtil';
import {RealOptions} from '@options';
import {ITargetOptions} from '@interpret';

interface CommonTypeGroupEntry {
  type: OmniType;
  model: OmniModel;
}

export enum CompressTypeLevel {
  EXACT,
  FUNCTIONALLY_SAME,
}

export class OmniModelMerge {

  /**
   * Takes an array of models and returns a new model that will contain parts that are common between them.
   * The given models will also be modified so that they all point to things in the common model.
   *
   * TODO: More control, like deciding name between two identical types other than name
   */
  public static merge<TOpt extends ITargetOptions>(
    results: OmniModelParserResult<RealOptions<TOpt>>[],
    options: Partial<RealOptions<TOpt>>,
  ): OmniModelParserResult<TOpt> {

    if (results.length == 0) {
      throw new Error(`Must give at least one model to merge`);
    }

    if (results.length == 1) {
      return results[0];
    }

    const common: OmniModel = {
      name: results.map(it => it.model.name).join(' & '),
      endpoints: [],
      types: [],
      servers: [],
      continuations: [],
      externalDocumentations: [],

      // We take the first one here, but it might as well be multiple different ones. Do we care?
      schemaType: results[0].model.schemaType,
      schemaVersion: results[0].model.schemaVersion,
      version: results[0].model.version,
      contact: {
        name: [...new Set(results.map(it => it.model.contact?.name).filter(it => it !== undefined))].join(' / '),
        url: [...new Set(results.map(it => it.model.contact?.url).filter(it => it !== undefined))].join(' / '),
        email: [...new Set(results.map(it => it.model.contact?.email).filter(it => it !== undefined))].join(' / '),
      },
      license: results.find(it => it.model.license !== undefined)?.model.license,
      description: results.map(it => it.model.description).join(', ')
    };

    // NOTE: Is this actually the way to do this? Just merge the options and the earlier models take precedence?
    let commonOptions: RealOptions<TOpt> = results[0].options;
    for (let i = 1; i < results.length; i++) {
      commonOptions = {...results[i].options, ...commonOptions};
    }

    commonOptions = {...commonOptions, ...options};
    common.options = commonOptions;

    const allTypes: CommonTypeGroupEntry[] = results
      .map(it => it.model)
      .flatMap(model => {

      const modelTypes = OmniUtil.getAllExportableTypes(model).all
        .filter(it => it.kind != OmniTypeKind.PRIMITIVE && it.kind != OmniTypeKind.NULL);

      return modelTypes.map(type => {
        return {
          type: type,
          model: model
        };
      });
    });

    const commonTypesGroups: CommonTypeGroupEntry[][] = [];
    const flatCommonTypes = new Set<OmniType>();

    // We need to sort the common types so they are in order of extensions
    commonTypesGroups.sort((a, b) => {

      const aFirst = a[0].type;
      const bFirst = b[0].type;

      // TODO: Need to check if this is actually the correct way of handling it or not.
      if (OmniModelMerge.isExtendedBy(aFirst, bFirst)) {
        return 1;
      } else if (OmniModelMerge.isExtendedBy(bFirst, aFirst)) {
        return -1;
      }

      return 0;
    })

    for (let i = 0; i < allTypes.length; i++) {

      if (allTypes[i].type.kind == OmniTypeKind.PRIMITIVE) {
        continue;
      }

      if (flatCommonTypes.has(allTypes[i].type)) {
        continue;
      }

      const alike = OmniModelMerge.findAlikeTypes(allTypes[i], allTypes, commonOptions.compressTypesLevel);

      if (alike.length > 0) {
        const withSelf = [...[allTypes[i], ...alike]];
        commonTypesGroups.push(withSelf);
        withSelf.forEach(it => flatCommonTypes.add(it.type));
      }
    }

    for (const group of commonTypesGroups) {

      // Each entry in this group is an equal type, but placed inside different models.
      // We should select one of the entries, move it into a common model, and then replace all references.

      const commonType = {...group[0].type}; // NOTE: Should we deep-clone this?

      if ('name' in commonType) {

        // TODO: The commonType should have a name that works for all entries of the group!
        //        If they are all the same, then yay, happy days.
        //        But if they are different, what do we do then?
        //        Just take the first?
        //        Use a custom resolver if possible?
        //        Take the common prefix (and/or suffix) words of the two? (most likely...)
      }

      const replacement: OmniExternalModelReferenceType<OmniType> = {
        kind: OmniTypeKind.EXTERNAL_MODEL_REFERENCE,
        model: common,
        of: commonType,
      };

      // TODO: How will we know later that the type is a general one? IT NEEDS TO GO IN A SHARED/SEPARATE PACKAGE OR SOMETHING!
      //        We need to know in the package resolver that it should be placed on a unique shared path that multiple outputs will use!
      //        Do we introduce a new type kind? A "OTHER_MODEL_REFERENCE"? That does feel best, so we can always keep track of it...
      //          - Then rename REFERENCE into HARDCODED_REFERENCE?

      common.types.push(commonType);

      for (const entry of group) {

        // Replace the type in each respective model with the replacement type.
        OmniUtil.swapTypeForWholeModel(entry.model, entry.type, replacement);

        // And replace the replacement type in the common model with the common type.
        // OmniUtil.swapTypeForWholeModel(common, replacement, commonType);
      }
    }

    for (const type of common.types) {

      OmniUtil.traverseTypes(type, (localType) => {

        if (localType.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {

          // If the common model has an external model reference, then we need to resolve it to the true type.
          // Otherwise we will end up with a recursive model.
          OmniUtil.swapTypeForWholeModel(common, localType, localType.of);
        }
      });
    }

    return {
      model: common,
      options: commonOptions,
    };
  }

  private static isExtendedBy(a: OmniType, b: OmniType): boolean {
    if (a.kind == OmniTypeKind.OBJECT) {
      if (a.extendedBy == b) {
        return true;
      }
    }

    return false;
  }

  private static findAlikeTypes(type: CommonTypeGroupEntry, types: CommonTypeGroupEntry[], level: CompressTypeLevel): CommonTypeGroupEntry[] {

    const alike: CommonTypeGroupEntry[] = [];
    for (const otherType of types) {

      if (otherType.type == type.type) {

        // If it is the exact same, then we do not count it. We want similar types, not the exact same.
        continue;
      }

      if (OmniModelMerge.isAlikeTypes(type.type, otherType.type, level)) {
        alike.push(otherType);
      }
    }

    return alike;
  }

  private static isAlikeTypes(a: OmniType, b: OmniType, level: CompressTypeLevel): boolean {
    if (a.kind != b.kind) {
      return false;
    }

    if (level == CompressTypeLevel.EXACT) {
      if (a.summary != b.summary || a.description != b.description || a.title != b.title) {
        return false;
      }
    }

    if (a.kind == OmniTypeKind.OBJECT && b.kind == OmniTypeKind.OBJECT) {
      return OmniModelMerge.isAlikeObjects(a, b, level);
    }

    if (a.kind == OmniTypeKind.PRIMITIVE && b.kind == OmniTypeKind.PRIMITIVE) {
      if (a.primitiveKind == b.primitiveKind && a.nullable == b.nullable) {
        return true;
      }
    }

    if (a.kind == OmniTypeKind.INTERFACE && b.kind == OmniTypeKind.INTERFACE) {
      return OmniModelMerge.isAlikeTypes(a.of, b.of, level);
    }

    return false;
  }

  private static isAlikeObjects(a: OmniObjectType, b: OmniObjectType, level: CompressTypeLevel): boolean {

    if (a.properties.length != b.properties.length) {
      return false;
    }

    if (a.additionalProperties != b.additionalProperties) {
      return false;
    }

    for (let i = 0; i < a.properties.length; i++) {
      if (!OmniModelMerge.isAlikeProperties(a.properties[i], b.properties[i], level)) {
        return false;
      }
    }

    if (a.extendedBy || b.extendedBy) {
      if (!a.extendedBy || !b.extendedBy) {
        return false;
      }

      if (!OmniModelMerge.isAlikeTypes(a.extendedBy, b.extendedBy, level)) {
        return false;
      }
    }

    return true;
  }

  private static isAlikeProperties(aProp: OmniProperty, bProp: OmniProperty, level: CompressTypeLevel): boolean {

    if (aProp.required != bProp.required || aProp.deprecated != bProp.deprecated) {
      return false;
    }

    if (aProp.accessLevel != bProp.accessLevel) {
      return false;
    }

    if (aProp.name != bProp.name) {
      return false;
    }

    if (aProp.propertyName != bProp.propertyName) {
      return false;
    }

    if (aProp.fieldName != bProp.fieldName) {
      return false;
    }

    if (level == CompressTypeLevel.EXACT) {
      if (aProp.description != bProp.description) {
        return false;
      }
    }

    if (aProp.annotations?.length != bProp.annotations?.length) {
      return false;
    }

    if (aProp.annotations && bProp.annotations) {

      for (let n = 0; n < aProp.annotations.length; n++) {
        // TODO: Do something? Is this *ever* used? Should "annotations" just be removed?
      }
    }

    if (!OmniModelMerge.isAlikeTypes(aProp.type, bProp.type, level)) {
      return false;
    }

    return true;
  }
}
