import {
  OmniExternalModelReferenceType, OmniItemKind,
  OmniModel,
  OmniModelParserResult,
  OmniType,
  OmniTypeKind,
} from '@omnigen/api';
import {Options} from '@omnigen/api';
import {DFSTraverseContext} from './OmniTypeVisitor.js';
import {HashUtil} from './HashUtil.js';
import {LoggerFactory} from '@omnigen/core-log';
import {OmniUtil} from './OmniUtil.js';
import {TypeOwner} from '@omnigen/api';
import {ProxyReducerOmni2} from '../reducer2/ProxyReducerOmni2.ts';
import {ANY_KIND} from '../reducer2/types.ts';

const logger = LoggerFactory.create(import.meta.url);

export interface Replacement<T extends TypeOwner> {
  root: T;
  from: OmniType;
  to: OmniType;
}

interface ReplacementOption<T extends TypeOwner> {
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

  public static getReplacements<T extends TypeOwner>(...roots: T[]): Replacement<T>[] {

    const replacements: Replacement<T>[] = [];
    const collections = new Map<T, DFSTraverseContext[]>();
    for (const model of roots) {

      const collection: DFSTraverseContext[] = [];
      OmniUtil.visitTypesDepthFirst(model, ctx => {
        collection.push(ctx);
        if (ctx.type.kind === OmniTypeKind.GENERIC_SOURCE) {
          ctx.skip = true;
        }
      });

      collections.set(model, collection);
    }

    const noopContext: DFSTraverseContext = {
      type: {kind: OmniTypeKind.UNKNOWN},
      depth: 9999999,
      skip: false,
      parent: undefined,
      visited: [],
    };

    const previousContexts = new Map<TypeOwner, DFSTraverseContext>();
    const hashMaps = new Map<TypeOwner, Map<OmniType, string>>();
    const optionsMap = new Map<string, ReplacementOption<T>[]>();

    // Keep going while there are multiple models with types left.
    while (this.matchesMultiple([...collections.values()], a => a.length > 0)) {

      for (const [model, collection] of collections) {

        const previousCtx: DFSTraverseContext = previousContexts.get(model) ?? noopContext;

        while (collection.length > 0) {

          const ctx = collection[collection.length - 1];
          if (!ctx) {
            continue;
          }

          if (ctx.depth != previousCtx.depth) { // } || ctx.typeDepth != previousCtx.typeDepth) {

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
  public static merge<TOpt extends Options>(
    results: OmniModelParserResult<TOpt>[],
    options: Partial<TOpt>,
  ): OmniModelParserResult<TOpt> {

    if (results.length == 0) {
      throw new Error(`Must give at least one model to merge`);
    }

    if (results.length == 1) {
      return results[0];
    }

    let common: OmniModel = {
      kind: OmniItemKind.MODEL,
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
        kind: OmniItemKind.CONTACT,
        name: [...new Set(results.map(it => it.model.contact?.name).filter(it => it !== undefined))].join(' / '),
        url: [...new Set(results.map(it => it.model.contact?.url).filter(it => it !== undefined))].join(' / '),
        email: [...new Set(results.map(it => it.model.contact?.email).filter(it => it !== undefined))].join(' / '),
      },
      license: results.find(it => it.model.license !== undefined)?.model.license,
      description: results.map(it => it.model.description).join(', '),
    };

    // NOTE: Is this actually the way to do this? Just merge the options and the earlier models take precedence?
    const commonOptions = this.mergeOptions(results, options);
    // common.options = commonOptions;

    const replacements = OmniModelMerge.getReplacements(...results.map(it => it.model));

    // Skip the simple type
    const skippedKinds: OmniTypeKind[] = [
      OmniTypeKind.UNKNOWN, OmniTypeKind.ARRAY,
      OmniTypeKind.GENERIC_TARGET, OmniTypeKind.GENERIC_TARGET_IDENTIFIER,
    ];
    const usefulReplacements = replacements.filter(it => !OmniUtil.isPrimitive(it.from) && !skippedKinds.includes(it.from.kind));

    for (const replacement of usefulReplacements) {

      if (!common.types.includes(replacement.to)) {

        // Add the type to our common model.
        common.types.push(replacement.to);
      }

      // Create the wrapper to tell that the type is in another model.
      const toExternal: OmniExternalModelReferenceType = {
        kind: OmniTypeKind.EXTERNAL_MODEL_REFERENCE,
        model: common,
        of: replacement.to,
        name: {
          name: OmniUtil.getTypeName(replacement.to) || OmniUtil.getVirtualTypeName(replacement.to),
        },
      };

      common = ProxyReducerOmni2.builder().reduce(common, {}, {
        [ANY_KIND]: (n, r) => {
          if (n === replacement.from) {
            r.replace(toExternal);
          }
        },
      });
    }

    const externalReplacements: [number] = [0];
    do {

      externalReplacements[0] = 0;

      common = ProxyReducerOmni2.builder().reduce(common, {}, {
        EXTERNAL_MODEL_REFERENCE: (_, r) => {

          // If the common model has an external model reference, then we should resolve it to the true type.
          // This removes some chance of recursive models, and simplifies the model.
          const reduced = r.yieldBase();
          if (reduced && reduced.kind === OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
            r.replace(reduced.of);
          }
          externalReplacements[0]++;
        },
      });

      // // REMOVE;
      // OmniUtil.visitTypesDepthFirst(common, ctx => {
      //
      //   if (ctx.type.kind === OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      //
      //     // If the common model has an external model reference, then we should resolve it to the true type.
      //     // This removes some chance of recursive models, and simplifies the model.
      //     ctx.replacement = ctx.type.of;
      //     externalReplacements[0]++;
      //   }
      // }, undefined, false);

      logger.debug(`Swapped out ${externalReplacements[0]} types from external references to resolved type`);

    } while (externalReplacements[0] > 0);

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
    options: Partial<TOpt>,
  ): TOpt {

    let commonOptions: TOpt = {...results[0].options};
    for (let i = 1; i < results.length; i++) {
      commonOptions = {...results[i].options, ...commonOptions};
    }

    return {...commonOptions, ...options};
  }
}
