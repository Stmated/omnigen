import {
  Naming,
  OmniExternalModelReferenceType,
  OmniModel,
  OmniModelParserResult,
  OmniObjectType,
  OmniProperty,
  OmniType,
  OmniTypeKind,
  OmniUtil,
  TypeName,
} from '../parse';
import {RealOptions} from '../options';
import {CompressTypeNaming, TargetOptions, OmniTypeNameReducer} from '../interpret';
import {CompressTypeLevel} from './CompressTypeLevel';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(__filename);

interface CommonTypeGroupEntry {
  type: OmniType;
  model: OmniModel;
}

/**
 * Helps with merging multiple models into one by finding types that are semantically the same.
 * Depending on the given options, different levels of merging will be allowed.
 * For example, it can be allowed to merge types even if:
 * <ul>
 *  <li>they have different comments and descriptions.</li>
 *  <li>they have different names (currently no resolving method to choose which name is best exists)</li>
 * </ul>
 */
export class OmniModelMerge {

  /**
   * Takes an array of models and returns a new model that will contain parts that are common between them.
   * The given models will also be modified so that they all point to things in the common model.
   *
   * TODO: More control, like deciding name between two identical types other than name
   *
   * @param results The different models that should be attempted to be merged
   * @param options The target options, which might be a merge of the different targets', or something of its own.
   */
  public static merge<TOpt extends TargetOptions>(
    results: OmniModelParserResult<TOpt>[],
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
      description: results.map(it => it.model.description).join(', '),
    };

    // NOTE: Is this actually the way to do this? Just merge the options and the earlier models take precedence?
    let commonOptions: RealOptions<TOpt> = {...results[0].options};
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
            model: model,
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
    });

    for (const entry of allTypes) {

      if (entry.type.kind == OmniTypeKind.PRIMITIVE) {
        continue;
      }

      if (flatCommonTypes.has(entry.type)) {
        continue;
      }

      const alike = OmniModelMerge.findAlikeTypes(
        entry,
        allTypes,
        commonOptions.compressTypesLevel,
      );

      if (alike.length > 0) {
        const withSelf = [...[entry, ...alike]];
        commonTypesGroups.push(withSelf);
        withSelf.forEach(it => flatCommonTypes.add(it.type));
      }
    }

    for (const group of commonTypesGroups) {

      // Each entry in this group is an equal type, but placed inside different models.
      // We should select one of the entries, move it into a common model, and then replace all references.

      const commonType = {...group[0].type}; // NOTE: Should we deep-clone this?

      let commonName: TypeName | undefined = undefined;
      if ('name' in commonType) {

        const foundCommonName = OmniModelMerge.getCommonTypeName(
          group.map(g => OmniUtil.getTypeName(g.type)).filter(it => it != undefined),
          commonOptions.compressTypeNaming,
          commonOptions.compressTypeNamingReducer,
        );

        if (foundCommonName) {
          commonName = foundCommonName;
          commonType.name = Naming.simplify(foundCommonName);
        } else {

          const allDescriptions = group.map(g => OmniUtil.getTypeDescription(g.type)).join(', ');
          logger.warn(`Could not find a common name between ${allDescriptions}; skipping merge`);
          continue;
        }
      }

      const replacement: OmniExternalModelReferenceType<OmniType> = {
        kind: OmniTypeKind.EXTERNAL_MODEL_REFERENCE,
        model: common,
        of: commonType,
        name: commonName,
      };

      // TODO: How will we know later that the type is a general one? IT NEEDS TO GO IN A SHARED/SEPARATE PACKAGE OR SOMETHING!
      //        We need to know in the package resolver that it should be placed on a unique shared path that multiple outputs will use!
      //        Do we introduce a new type kind? A "OTHER_MODEL_REFERENCE"? That does feel best, so we can always keep track of it...
      //          - Then rename REFERENCE into HARDCODED_REFERENCE?

      common.types.push(commonType);

      for (const entry of group) {

        // Replace the type in each respective model with the replacement type.
        OmniUtil.swapTypeForWholeModel(entry.model, entry.type, replacement);
      }
    }

    for (const type of common.types) {

      OmniUtil.traverseTypes(type, localType => {

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

  private static findAlikeTypes(
    type: CommonTypeGroupEntry,
    types: CommonTypeGroupEntry[],
    level: CompressTypeLevel,
  ): CommonTypeGroupEntry[] {

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

  private static isAlikeTypes(
    a: OmniType,
    b: OmniType,
    level: CompressTypeLevel,
  ): boolean {
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

  private static isAlikeObjects(
    a: OmniObjectType,
    b: OmniObjectType,
    level: CompressTypeLevel,
  ): boolean {

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

  private static getCommonTypeName(
    names: TypeName[],
    namingEquality: CompressTypeNaming,
    namingReducer: OmniTypeNameReducer | undefined,
  ): TypeName | undefined {

    const unwrappedNames = names.map(it => Naming.unwrapAll(it));

    if (namingReducer) {

      // If we have a naming reducer, we will always prefer it to any other setting.
      // But if it does not return a resulting name, then we will try to figure one out below.
      // TODO: Would be beneficial if we could know which packages these types were destined for, to use in the reducer
      const reduced = namingReducer(unwrappedNames);
      if (reduced) {
        if (typeof reduced == 'string') {
          return reduced;
        } else {

          // We have been told by the reducer to use another naming equality check for these names.
          namingEquality = reduced;
        }
      }
    }

    // We always prefer the name that is exactly the same between the two.
    const sameNames = unwrappedNames[0].filter(name => unwrappedNames.every(group => group.includes(name)));
    if (sameNames.length > 0) {
      // We return all the matched same names, for probable better fallback if there are name clashes.
      return sameNames;
    }

    if (namingEquality == CompressTypeNaming.EXACT) {

      // But if no exact one was found, and that is what we wanted, then we return undefined.
      return undefined;
    } else if (namingEquality == CompressTypeNaming.FIRST) {
      for (const entry of unwrappedNames) {
        if (entry.length > 0) {
          return entry[0];
        }
      }

      return undefined;
    } else if (namingEquality == CompressTypeNaming.COMMON_PREFIX) {

      // We currently only check for prefix for the FIRST name of the groups.
      // This should maybe be improved, but I do not know how to logically know which names in which are comparable.
      const prefix = OmniModelMerge.getCommonPrefix([...unwrappedNames.map(group => group[0])]);
      if (prefix && prefix.length > 0) {
        return prefix;
      }

    } else if (namingEquality == CompressTypeNaming.COMMON_SUFFIX) {

      const suffix = OmniModelMerge.getCommonSuffix([...unwrappedNames.map(group => group[0])]);
      if (suffix && suffix.length > 0) {
        return suffix;
      }
    } else if (namingEquality == CompressTypeNaming.COMMON_PREFIX_AND_SUFFIX) {

      const prefix = OmniModelMerge.getCommonPrefix([...unwrappedNames.map(group => group[0])]);
      const suffix = OmniModelMerge.getCommonSuffix([...unwrappedNames.map(group => group[0])]);
      const joined = `${prefix}${suffix}`;

      if (joined && joined.length > 0) {
        return joined;
      }
    } else if (namingEquality == CompressTypeNaming.JOIN) {
      return unwrappedNames.map(it => it[0]).join('');
    }

    return undefined;
  }

  private static getCommonPrefix(names: string[]): string {

    const wordsArray = names.map(name => OmniModelMerge.getWords(name));
    for (let wordIndex = 0; wordIndex < wordsArray[0].length; wordIndex++) {

      const refWord = wordsArray[0][wordIndex];
      for (let wordsIndex = 1; wordsIndex < wordsArray.length; wordsIndex++) {
        if (wordIndex >= wordsArray[wordsIndex].length || refWord != wordsArray[wordsIndex][wordIndex]) {

          // This is as far as we could find any common prefix words.
          return wordsArray[0].slice(0, wordIndex).join('');
        }
      }
    }

    return wordsArray[0].join('');
  }

  private static getCommonSuffix(_names: string[]): string {
    // TODO: Implement!
    return '';
  }

  private static getWords(name: string) {

    const slashIndex = name.lastIndexOf('/');
    if (slashIndex != -1) {

      // If there is a slash in the name, we have some kind of schema-name.
      // We should probably never care about those parts in the same, since it's just /components/schema or similar.
      // TODO: Maybe create some central method to solve these issues? That can keep track on per-parser what is a good name?
      name = name.substring(slashIndex + 1);
    }

    const words: string[] = [];
    // SomeASTClass = [Some, AST, Class]
    // Some2AST2Class2 = [Some2, AST2, Class2]
    // someWithSmallLetters = [some, With, Small, Letters]
    // /components/schemas/Thing = [Thing]
    for (const match of name.matchAll(/\p{Lu}{2,}(?=\p{Lu}\p{Ll})|[\d\p{Lu}]+?[\p{Ll}\d]+\d*|\p{Lu}$|[\p{Ll}\d]+/gmu)) {
      words.push(match['0']);
    }

    return words;
  }

  private static isAlikeProperties(
    aProp: OmniProperty,
    bProp: OmniProperty,
    level: CompressTypeLevel,
  ): boolean {

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
