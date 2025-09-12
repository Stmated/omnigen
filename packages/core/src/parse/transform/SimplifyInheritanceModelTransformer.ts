import {
  OMNI_GENERIC_FEATURES,
  OmniCompositionType,
  OmniExclusiveUnionType,
  OmniIntersectionType,
  OmniModel,
  OmniModel2ndPassTransformer,
  OmniModelTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniModelTransformerArgs, OmniNode,
  OmniType,
  OmniTypeKind,
  OmniUnionType,
} from '@omnigen/api';
import {OmniUtil} from '../OmniUtil';
import {LoggerFactory} from '@omnigen/core-log';
import {ProxyReducerOmni2} from '../../reducer2/ProxyReducerOmni2';
import {ANY_KIND, MutableProxyReducerInterface} from '../../reducer2/types.ts';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Takes an OmniModel and tries to simplify the inheritance hierarchy non-destructively.
 * It does this by seeing if types have common ancestors and skipping the superfluously stated ones.
 *
 * TODO: Needs to be rewritten to use the new reducer pattern instead of these inline changes
 */
export class SimplifyInheritanceModelTransformer implements OmniModelTransformer, OmniModel2ndPassTransformer {

  transformModel(args: OmniModelTransformerArgs): void {

    args.model = ProxyReducerOmni2.builder().reduce(args.model, {immutable: false}, {
      OBJECT: (n, r) => {

        const reduced = r.yieldBase();
        if (reduced && reduced.kind === OmniTypeKind.OBJECT && reduced.extendedBy && reduced.extendedBy.kind === OmniTypeKind.INTERSECTION) {

          // Intersection that has inline child types and is owned by an object can have their properties moved to the object.
          // TODO: This might not always be true; the Intersection could be used elsewhere where this is not suitable. Needs a fix.
          let obj: OmniType = reduced;
          const types = [...reduced.extendedBy.types];

          for (let i = 0; i < types.length; i++) {
            const child = types[i];
            if (child.inline) {
              obj = OmniUtil.mergeType(child, obj, OMNI_GENERIC_FEATURES);
              types.splice(i, 1);
            }
          }

          if (obj !== reduced) {
            if (obj.kind === OmniTypeKind.OBJECT) {

              obj.extendedBy = {
                ...reduced.extendedBy,
                types: types,
              };
            }

            r.replace(obj);
          }
        }
      },
    });

    if (args.options.simplifyTypeHierarchy) {

      args.model = ProxyReducerOmni2.builder().reduce(args.model, {immutable: false}, {
        INTERSECTION: (n, r) => {
          const reduced = r.yieldBase();
          if (reduced && reduced.kind === OmniTypeKind.INTERSECTION) {
            SimplifyInheritanceModelTransformer.simplifyIntersection(reduced, args.model, r);
          }
        },
      });
    }
  }

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs) {

    if (args.features.primitiveInheritance) {
      return;
    }

    logger.silent(`Language does not support primitive inheritance, so will look for replacements. Looking inside '${args.model.name}'`);

    args.model = ProxyReducerOmni2.builder().reduce(args.model, {}, {
      OBJECT: (_, r) => {

        const reduced = r.yieldBase();
        if (reduced && reduced.kind === OmniTypeKind.OBJECT && reduced.extendedBy && OmniUtil.isPrimitive(reduced.extendedBy)) {
          if (reduced.properties.length > 0) {
            throw new Error(`Cannot make object ${OmniUtil.describe(reduced)} which extends primitive ${OmniUtil.describe(reduced.extendedBy)} into the primitive since we would lose properties`);
          }

          // Replace ourself with the extension.
          r.replace(OmniUtil.cloneAndCopyTypeMeta(reduced.extendedBy, reduced));
          r.persist();
        }
      },
    });
  }

  private static simplifyIntersection(
    composition: OmniIntersectionType,
    model: OmniModel,
    r: MutableProxyReducerInterface<OmniIntersectionType, OmniIntersectionType, any, any, any, any>,
  ): void {

    // If the composition is an AND, there might be paths that have overlapping supertypes.
    // We should try to resolve and simplify if any of the types are superfluous.

    let changeCount = 0;
    const newTypes = [...composition.types];

    const hierarchies: OmniType[][] = [];
    for (let i = 0; i < newTypes.length; i++) {

      const type = newTypes[i];
      if (OmniUtil.asSubType(type)) {
        const hierarchy = OmniUtil.getSuperTypeHierarchy(model, type);
        if (hierarchy.length > 0) {
          hierarchies.push(hierarchy);
        }
      }
    }

    for (let i = 0; i < newTypes.length; i++) {

      // If the current composition composition type already exists in any of the other hierarchies,
      // then we can skip it here since it will amount to the semantically same type.
      // NOTE: There might need to be future special heed taken to the importance of class over interface.
      //        But for now we will only care about the semantic equality and not the smallest code generated.

      if (hierarchies.find(hierarchy => hierarchy.find(it => it == newTypes[i]))) {

        // The composition type already exists as a descendant of another composition entry.
        // So we can simplify things by removing this explicit type in favor of the other more specific one.
        newTypes.splice(i, 1);
        changeCount++;
        i--;
      }
    }

    if (changeCount > 0) {
      r.put('types', newTypes);
    }
  }
}
