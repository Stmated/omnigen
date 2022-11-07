import {OmniModel, OmniModelParserResult, OmniType, OmniTypeKind, OmniUtil, TypeOwner} from '../parse';
import {Options, RealOptions} from '../options';
import {TargetOptions} from '../interpret';
import {LoggerFactory} from '@omnigen/core-log';
import {BFSTraverseContext} from './OmniTypeVisitor';
import {HashUtil} from './HashUtil';

const logger = LoggerFactory.create(__filename);

export interface Replacement<T extends TypeOwner<OmniType>> {
  root: T;
  from: OmniType;
  to: OmniType;
}

interface ReplacementOption<T extends TypeOwner<OmniType>> {
  root: T;
  from: OmniType;
}

/**
 * Helps with merging multiple models into one by finding types that are semantically the same.
 * Depending on the given options, different levels of merging will be allowed.
 * For example, it can be allowed to merge types even if:
 * <ul>
 *  <li>they have different comments and descriptions.</li>
 *  <li>they have different names (currently exists no resolving method to choose which name is best)</li>
 * </ul>
 */
export class OmniModelMerge {

  public static getReplacements<T extends TypeOwner<OmniType>>(...roots: T[]): Replacement<T>[] {

    const replacements: Replacement<T>[] = [];

    // TODO: Create a hashing system! Use depth-first and go through on "up" and create hash based on inheritance!
    //        Then we replace all the types with the exact same hash!
    //        Make sure superTypeToSubTypes() can handle searching inside ALL MODELS! Add model references inside the models?
    //        Might become needed to run the merge SEVERAL TIMES... OR IS IT?! Will it find all, or do they need to be step-by-step resolved?!
    //        Create test cases that are COMPLEX and where we could anticipate there being a need for multiple passes!

    const collections = new Map<T, BFSTraverseContext[]>();
    for (const model of roots) {

      const reversed: BFSTraverseContext[] = [];
      OmniUtil.visitTypesBreadthFirst(model, ctx => {
        reversed.push(ctx);
      });

      collections.set(model, reversed);
    }

    const noopContext: BFSTraverseContext = {
      type: {kind: OmniTypeKind.UNKNOWN},
      typeDepth: 9999999,
      useDepth: 9999999,
      skip: false,
      owner: {kind: OmniTypeKind.UNKNOWN},
      parent: undefined,
    };

    const previousContexts = new Map<TypeOwner<OmniType>, BFSTraverseContext>();
    const hashMaps = new Map<TypeOwner<OmniType>, Map<OmniType, string>>();
    const optionsMap = new Map<string, ReplacementOption<T>[]>();

    // Keep going while there are multiple models with types left.
    while (this.matchesMultiple([...collections.values()], a => a.length > 0)) {

      for (const [model, collection] of collections) {

        const previousCtx: BFSTraverseContext = previousContexts.get(model) ?? noopContext;

        while (collection.length > 0) {

          const ctx = collection[collection.length - 1];
          if (!ctx) {
            continue;
          }

          if (ctx.useDepth != previousCtx.useDepth || ctx.typeDepth != previousCtx.typeDepth) {

            // For next iteration we will only go through the types of this depth.
            previousContexts.set(model, ctx);
            break;
          }

          // We've peeked at it, and we want it, so we can pop it.
          collection.pop();

          const hashMap = (hashMaps.has(model) ? hashMaps : hashMaps.set(model, new Map<OmniType, string>())).get(model)!;
          const hash = HashUtil.getStructuralHashOf(ctx.type, ctx.parent, hashMap);
          hashMap.set(ctx.type, hash);

          const options = (optionsMap.has(hash) ? optionsMap : optionsMap.set(hash, [])).get(hash)!;
          options.push({root: model, from: ctx.type});
        }
      }
    }

    for (const [_hash, options] of optionsMap.entries()) {

      if (options.length < 2) {
        continue;
      }

      // We do not actually move any types here.
      // We simply build up the result of all the types that are similar and can be replaced.
      for (const option of options) {
        replacements.push({
          root: option.root,
          from: option.from,
          to: options[0].from,
        });
      }
    }

    return replacements;


    // const bfsCollection: BFSTraverseContext[][] = [];
    // for (const model of roots) {
    //
    //   // Let's search through the whole model, breadth-first, bottom-up.
    //   const bfs: BFSTraverseContext[] = [];
    //   bfsCollection.push(bfs);
    //
    //   OmniUtil.visitTypesBreadthFirst(model, ctx => {
    //     bfs.push(ctx);
    //   });
    // }
    //
    // // We now have arrays of types in the order of a BFS.
    // // If we travel it backwards, we will be able to replace types in the correct order.
    // const depths: number[] = Array.from(Array(bfsCollection.length)).map(() => -1);
    //
    // // We will keep going as long as there are two (or more) collections with types left.
    // while (OmniModelMerge.matchesMultiple(bfsCollection, array => array.length > 0)) {
    //
    //   const depths: number[] = Array.from(Array(bfsCollection.length)).map(() => -1);
    //   for (let i = 0; i < bfsCollection.length; i++) {
    //
    //     if (bfsCollection[i].length == 0) {
    //       continue;
    //     }
    //
    //     const head = bfsCollection[i][bfsCollection[i].length - 1];
    //     const previousDepth = depths[i];
    //     const currentDepth = head.typeDepth;
    //
    //     if (currentDepth < previousDepth) {
    //
    //       // Break out of this one, and let's
    //       break;
    //     }
    //   }
    // }
    //
    // return replacements;
  }

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
    const commonOptions = this.mergeOptions(results, options);
    common.options = commonOptions;

    // TODO:
    // * First go through all and find all that are similar
    // * Then go through each separate model from BOTTOMS UP, and replace in order from the bottom
    // * If an object has a SUPERTYPE -- then that SUPERTYPE MUST BE IN THE LIST OF GENERAL/MOVED OBJECTS
    //    - This way we can quickly and easily know if a type for that model can be moved!
    // * Is it possible to do this "lazily"? Checking if two types are the same.
    //    - If we can, then we can maybe skip checking the supertypes every time for equality?
    //    - Or is it "mathematically" proven that if they match ON THEIR OWN and the BOTTOMS UP comparison works,
    //      that is it not needed at all anyway? That if they match from bottoms up anyway, they MUST match all the way?


    // const allTypes: CommonTypeGroupEntry[] = results
    //   .map(it => it.model)
    //   .flatMap(model => {
    //
    //     // TODO: Redo search so it does a DEPTH-FIRST search and adds ON UP.
    //     //        This way we will get the edge nodes FIRST, and replace in a more correct order!
    //
    //     OmniUtil.visitTypesDepthFirst(model, undefined, ctx => {
    //
    //       // We will go from final edge (deepest) type, and then move upwards.
    //       // We will att supertypes to an allowed list of "similar" supertypes.
    //       // We can ONLY move a subtype to be merged
    //     });
    //
    //     const modelTypes = OmniUtil.getAllExportableTypes(model).all
    //       .filter(
    //         it =>
    //           (it.kind != OmniTypeKind.PRIMITIVE || it.nullable == PrimitiveNullableKind.NOT_NULLABLE_PRIMITIVE)
    //           && it.kind != OmniTypeKind.NULL && it.kind != OmniTypeKind.UNKNOWN,
    //       );
    //
    //     return modelTypes.map(type => {
    //       return {
    //         type: type,
    //         model: model,
    //       };
    //     });
    //   });
    //
    // allTypes.sort((a, b) => sorter(a.type, b.type));
    //
    // const commonTypesGroups: CommonTypeGroupEntry[][] = [];
    // const flatCommonTypes = new Set<OmniType>();
    //
    // for (const entry of allTypes) {
    //
    //   if (entry.type.kind == OmniTypeKind.PRIMITIVE) {
    //     continue;
    //   }
    //
    //   if (flatCommonTypes.has(entry.type)) {
    //     continue;
    //   }
    //
    //   const alike = OmniModelMerge.findAlikeTypes(
    //     entry,
    //     allTypes,
    //     // TODO: Remove this "any" cast! Create a simple reproducible test case, and post to Stackoverflow and ask why!
    //     commonOptions.compressTypesLevel as any,
    //   );
    //
    //   if (alike.length > 0) {
    //     const withSelf = [...[entry, ...alike]];
    //     commonTypesGroups.push(withSelf);
    //     withSelf.forEach(it => flatCommonTypes.add(it.type));
    //   }
    // }
    //
    // // We need to sort the common types so they are in order of extensions
    // commonTypesGroups.sort((a, b) => {
    //   // TODO: Need to check if this is actually the correct way of handling it or not.
    //   return sorter(b[0].type, a[0].type);
    // });
    //
    // for (const group of commonTypesGroups) {
    //
    //   // Each entry in this group is an equal type, but placed inside different models.
    //   // We should select one of the entries, move it into a common model, and then replace all references.
    //   if (group.length == 1) {
    //
    //     // But if the common type is only in one of the models, then skip it. It's not general.
    //     continue;
    //   }
    //
    //   const commonType = {...group[0].type}; // NOTE: Should we deep-clone this?
    //
    //   let commonName: TypeName | undefined = undefined;
    //   if ('name' in commonType) {
    //
    //     const foundCommonName = OmniModelMerge.getCommonTypeName(
    //       group.map(g => OmniUtil.getTypeName(g.type)).filter(it => it != undefined),
    //       commonOptions.compressTypeNaming as any,
    //       commonOptions.compressTypeNamingReducer as any,
    //     );
    //
    //     if (foundCommonName) {
    //       commonName = foundCommonName;
    //       commonType.name = Naming.simplify(foundCommonName);
    //     } else {
    //
    //       const allDescriptions = group.map(g => OmniUtil.describe(g.type)).join(', ');
    //       logger.warn(`Could not find a common name between ${allDescriptions}; skipping merge`);
    //       continue;
    //     }
    //   }
    //
    //   const replacement: OmniExternalModelReferenceType<OmniType> = {
    //     kind: OmniTypeKind.EXTERNAL_MODEL_REFERENCE,
    //     model: common,
    //     of: commonType,
    //     name: commonName,
    //   };
    //
    //   common.types.push(commonType);
    //
    //   for (const entry of group) {
    //
    //     // Replace the type in each respective model with the replacement type.
    //     OmniUtil.swapType(entry.model, entry.type, replacement);
    //   }
    // }
    //
    // // for (const type of common.types) {
    // //
    // //   OmniUtil.visitTypesDepthFirst(type, ctx => {
    // //
    // //     if (ctx.type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
    // //
    // //       // If the common model has an external model reference, then we need to resolve it to the true type.
    // //       // Otherwise we will end up with a recursive model.
    // //       OmniUtil.swapType(common, ctx.type, ctx.type.of);
    // //       ctx.skip = true;
    // //     }
    // //   });
    // // }
    //
    return {
      model: common,
      options: commonOptions,
    };
  }

  private static matchesMultiple<T>(arrays: T[][], predicate: { (array: T[]): boolean }): boolean {
    let matchCount = 0;
    for (const array of arrays) {
      if (predicate(array)) {
        matchCount++;
        if (matchCount > 1) {
          return true;
        }
      }
    }

    return false;
  }

  private static mergeOptions<TOpt extends Options>(
    results: OmniModelParserResult<TOpt>[],
    options: Partial<RealOptions<TOpt>>,
  ): RealOptions<TOpt> {

    let commonOptions: RealOptions<TOpt> = {...results[0].options};
    for (let i = 1; i < results.length; i++) {
      commonOptions = {...results[i].options, ...commonOptions};
    }

    return {...commonOptions, ...options};
  }

  //
  // private static findAlikeTypes(
  //   type: CommonTypeGroupEntry,
  //   types: CommonTypeGroupEntry[],
  //   level: CompressTypeLevel,
  // ): CommonTypeGroupEntry[] {
  //
  //   const alike: CommonTypeGroupEntry[] = [];
  //   for (const otherType of types) {
  //
  //     if (otherType.type == type.type) {
  //
  //       // If it is the exact same, then we do not count it. We want similar types, not the exact same.
  //       continue;
  //     }
  //
  //     if (OmniModelMerge.isAlikeTypes(type.type, otherType.type, level)) {
  //       alike.push(otherType);
  //     }
  //   }
  //
  //   return alike;
  // }
  //
  // /**
  //  * TODO: Delete this method and use the central one that can return the equality level of
  //  */
  // public static isAlikeTypes(
  //   a: OmniType,
  //   b: OmniType,
  //   level: CompressTypeLevel,
  // ): boolean {
  //   if (a.kind != b.kind) {
  //     return false;
  //   }
  //
  //   if (level == CompressTypeLevel.EXACT) {
  //     if (a.summary != b.summary || a.description != b.description || a.title != b.title) {
  //       return false;
  //     }
  //   }
  //
  //   const common = OmniUtil.getCommonDenominatorBetween(a, b, false);
  //   if (common) {
  //
  //     if (level == CompressTypeLevel.EXACT) {
  //       return common.level >= EqualityLevel.CLONE_MIN;
  //     }
  //
  //     return common.level >= EqualityLevel.FUNCTION_MIN;
  //   }
  //
  //   return false;
  // }
  //
  // private static getCommonTypeName(
  //   names: TypeName[],
  //   namingEquality: CompressTypeNaming,
  //   namingReducer: OmniTypeNameReducer | undefined,
  // ): TypeName | undefined {
  //
  //   const unwrappedNames = names.map(it => Naming.unwrapAll(it));
  //
  //   if (namingReducer) {
  //
  //     // If we have a naming reducer, we will always prefer it to any other setting.
  //     // But if it does not return a resulting name, then we will try to figure one out below.
  //     // TODO: Would be beneficial if we could know which packages these types were destined for, to use in the reducer
  //     const reduced = namingReducer(unwrappedNames);
  //     if (reduced) {
  //       if (typeof reduced == 'string') {
  //         return reduced;
  //       } else {
  //
  //         // We have been told by the reducer to use another naming equality check for these names.
  //         namingEquality = reduced;
  //       }
  //     }
  //   }
  //
  //   // We always prefer the name that is exactly the same between the two.
  //   const sameNames = unwrappedNames[0].filter(name => unwrappedNames.every(group => group.includes(name)));
  //   if (sameNames.length > 0) {
  //     // We return all the matched same names, for probable better fallback if there are name clashes.
  //     return sameNames;
  //   }
  //
  //   if (namingEquality == CompressTypeNaming.EXACT) {
  //
  //     // But if no exact one was found, and that is what we wanted, then we return undefined.
  //     return undefined;
  //   } else if (namingEquality == CompressTypeNaming.FIRST) {
  //     for (const entry of unwrappedNames) {
  //       if (entry.length > 0) {
  //         return entry[0];
  //       }
  //     }
  //
  //     return undefined;
  //   } else if (namingEquality == CompressTypeNaming.COMMON_PREFIX) {
  //
  //     // We currently only check for prefix for the FIRST name of the groups.
  //     // This should maybe be improved, but I do not know how to logically know which names in which are comparable.
  //     const prefix = OmniModelMerge.getCommonPrefix([...unwrappedNames.map(group => group[0])]);
  //     if (prefix && prefix.length > 0) {
  //       return prefix;
  //     }
  //
  //   } else if (namingEquality == CompressTypeNaming.COMMON_SUFFIX) {
  //
  //     const suffix = OmniModelMerge.getCommonSuffix([...unwrappedNames.map(group => group[0])]);
  //     if (suffix && suffix.length > 0) {
  //       return suffix;
  //     }
  //   } else if (namingEquality == CompressTypeNaming.COMMON_PREFIX_AND_SUFFIX) {
  //
  //     const prefix = OmniModelMerge.getCommonPrefix([...unwrappedNames.map(group => group[0])]);
  //     const suffix = OmniModelMerge.getCommonSuffix([...unwrappedNames.map(group => group[0])]);
  //     const joined = `${prefix}${suffix}`;
  //
  //     if (joined && joined.length > 0) {
  //       return joined;
  //     }
  //   } else if (namingEquality == CompressTypeNaming.JOIN) {
  //     return unwrappedNames.map(it => it[0]).join('');
  //   }
  //
  //   return undefined;
  // }
  //
  // private static getCommonPrefix(names: string[]): string {
  //
  //   const wordsArray = names.map(name => OmniModelMerge.getWords(name));
  //   for (let wordIndex = 0; wordIndex < wordsArray[0].length; wordIndex++) {
  //
  //     const refWord = wordsArray[0][wordIndex];
  //     for (let wordsIndex = 1; wordsIndex < wordsArray.length; wordsIndex++) {
  //       if (wordIndex >= wordsArray[wordsIndex].length || refWord != wordsArray[wordsIndex][wordIndex]) {
  //
  //         // This is as far as we could find any common prefix words.
  //         return wordsArray[0].slice(0, wordIndex).join('');
  //       }
  //     }
  //   }
  //
  //   return wordsArray[0].join('');
  // }
  //
  // private static getCommonSuffix(_names: string[]): string {
  //   // TODO: Implement!
  //   return '';
  // }
  //
  // private static getWords(name: string) {
  //
  //   const slashIndex = name.lastIndexOf('/');
  //   if (slashIndex != -1) {
  //
  //     // If there is a slash in the name, we have some kind of schema-name.
  //     // We should probably never care about those parts in the same, since it's just /components/schema or similar.
  //     // TODO: Maybe create some central method to solve these issues? That can keep track on per-parser what is a good name?
  //     name = name.substring(slashIndex + 1);
  //   }
  //
  //   const words: string[] = [];
  //   // SomeASTClass = [Some, AST, Class]
  //   // Some2AST2Class2 = [Some2, AST2, Class2]
  //   // someWithSmallLetters = [some, With, Small, Letters]
  //   // /components/schemas/Thing = [Thing]
  //   for (const match of name.matchAll(/\p{Lu}{2,}(?=\p{Lu}\p{Ll})|[\d\p{Lu}]+?[\p{Ll}\d]+\d*|\p{Lu}$|[\p{Ll}\d]+/gmu)) {
  //     words.push(match['0']);
  //   }
  //
  //   return words;
  // }
  //
  // public static isAlikeProperties(
  //   aProp: OmniProperty,
  //   bProp: OmniProperty,
  //   level: CompressTypeLevel,
  // ): boolean {
  //
  //   if (aProp.required != bProp.required || aProp.deprecated != bProp.deprecated) {
  //     return false;
  //   }
  //
  //   if (aProp.accessLevel != bProp.accessLevel) {
  //     return false;
  //   }
  //
  //   if (aProp.name != bProp.name) {
  //     return false;
  //   }
  //
  //   if (aProp.propertyName != bProp.propertyName) {
  //     return false;
  //   }
  //
  //   if (aProp.fieldName != bProp.fieldName) {
  //     return false;
  //   }
  //
  //   if (level == CompressTypeLevel.EXACT) {
  //     if (aProp.description != bProp.description) {
  //       return false;
  //     }
  //   }
  //
  //   if (aProp.annotations?.length != bProp.annotations?.length) {
  //     return false;
  //   }
  //
  //   if (aProp.annotations && bProp.annotations) {
  //
  //     for (let n = 0; n < aProp.annotations.length; n++) {
  //       // TODO: Do something? Is this *ever* used? Should "annotations" just be removed?
  //     }
  //   }
  //
  //   if (!OmniModelMerge.isAlikeTypes(aProp.type, bProp.type, level)) {
  //     return false;
  //   }
  //
  //   return true;
  // }
}
