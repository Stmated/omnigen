import {
  OMNI_GENERIC_FEATURES,
  OmniCompositionType,
  OmniExclusiveUnionType,
  OmniIntersectionType,
  OmniModel,
  OmniModel2ndPassTransformer,
  OmniModelTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniModelTransformerArgs,
  OmniType,
  OmniTypeKind,
  OmniUnionType,
} from '@omnigen/api';
import {OmniUtil} from '../OmniUtil';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Takes an OmniModel and tries to simplify the inheritance hierarchy non-destructively.
 * It does this by seeing if types have common ancestors and skipping the superfluously stated ones.
 */
export class SimplifyInheritanceModelTransformer implements OmniModelTransformer, OmniModel2ndPassTransformer {

  transformModel(args: OmniModelTransformerArgs): void {

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {
      if (args.options.simplifyTypeHierarchy && OmniUtil.isComposition(ctx.type)) {
        args.model = SimplifyInheritanceModelTransformer.simplifyComposition(args.model, ctx.type);
      } else if (ctx.type.kind === OmniTypeKind.OBJECT && ctx.type.extendedBy && ctx.type.extendedBy.kind === OmniTypeKind.INTERSECTION) {

        // Intersection that has inline child types and is owned by an object can have their properties moved to the object.
        // TODO: This might not always be true; the Intersection could be used elsewhere where this is not suitable. Needs a fix.
        let obj: OmniType = ctx.type;
        const types = ctx.type.extendedBy.types;

        for (let i = 0; i < types.length; i++) {
          const child = types[i];
          if (child.inline) {
            obj = OmniUtil.mergeType(child, obj, OMNI_GENERIC_FEATURES);
            types.splice(i, 1);
          }
        }

        if (obj !== ctx.type) {
          ctx.replacement = obj;
          const idx = args.model.types.indexOf(ctx.type);
          if (idx !== -1) {
            args.model.types.splice(idx, 1, obj);
          }
        }
      }
    });
  }

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs) {

    if (args.features.primitiveInheritance) {
      return;
    }

    logger.silent(`Language does not support primitive inheritance, so will look for replacements. Looking inside '${args.model.name}'`);

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {
      if (ctx.type.kind == OmniTypeKind.OBJECT && ctx.type.extendedBy && OmniUtil.isPrimitive(ctx.type.extendedBy)) {

        if (ctx.type.properties.length > 0) {
          throw new Error(`Cannot make object ${OmniUtil.describe(ctx.type)} which extends primitive ${OmniUtil.describe(ctx.type.extendedBy)} into the primitive since we would lose properties`);
        }

        // Replace ourself with the extension.
        ctx.replacement = OmniUtil.cloneAndCopyTypeMeta(ctx.type.extendedBy, ctx.type);
      }
    });
  }

  private static simplifyComposition(
    model: OmniModel,
    composition: OmniCompositionType,
  ): OmniModel {

    if (composition.kind == OmniTypeKind.INTERSECTION) {
      return SimplifyInheritanceModelTransformer.simplifyIntersection(composition, model);
    } else if (OmniUtil.isUnion(composition)) {
      return SimplifyInheritanceModelTransformer.simplifyUnion(composition, model);
    }

    return model;
  }

  /**
   * TODO: This should be moved to its own transformer that ONLY deals with making a `T | null` into `T?` -- not really relevant just for supertype simplification.
   */
  private static simplifyUnion(composition: OmniUnionType | OmniExclusiveUnionType, model: OmniModel): OmniModel {

    if (composition.types.length === 2) {
      for (let i = 0; i < composition.types.length; i++) {

        const type = OmniUtil.getUnwrappedType(composition.types[i]);
        if (OmniUtil.isNull(type)) {

          // One of the union members is `null` -- it can be removed and instead the other type can be made nullable.
          const otherIndex = (i === 0) ? 1 : 0;
          const otherType = composition.types[otherIndex];
          const otherUnwrappedType = OmniUtil.getUnwrappedType(otherType);

          composition.types.splice(i, 1);

          // TODO: We should not do this -- we're setting "nullable" to the original composition member! It might be used in different contexts!
          // TODO: Instead we should use a type decorator, and say on the decorator that the type is nullable. But decorators are not supported everywhere.
          otherUnwrappedType.nullable = true;

          if (!OmniUtil.isNullableType(otherUnwrappedType)) {
            composition.types[0] = OmniUtil.toReferenceType(otherType);
          }

          return model;
        }
      }
    }

    return model;
  }

  private static simplifyIntersection(composition: OmniIntersectionType, model: OmniModel): OmniModel {

    // If the composition is an AND, there might be paths that have overlapping supertypes.
    // We should try to resolve and simplify if any of the types are superfluous.
    const hierarchies: OmniType[][] = [];
    for (let i = 0; i < composition.types.length; i++) {

      const type = composition.types[i];
      if (OmniUtil.asSubType(type)) {
        const hierarchy = OmniUtil.getSuperTypeHierarchy(model, type);
        if (hierarchy.length > 0) {
          hierarchies.push(hierarchy);
        }
      }
    }

    for (let i = 0; i < composition.types.length; i++) {

      // If the current composition composition type already exists in any of the other hierarchies,
      // then we can skip it here since it will amount to the semantically same type.
      // NOTE: There might need to be future special heed taken to the importance of class over interface.
      //        But for now we will only care about the semantic equality and not the smallest code generated.

      if (hierarchies.find(hierarchy => hierarchy.find(it => it == composition.types[i]))) {

        // The composition type already exists as a descendant of another composition entry.
        // So we can simplify things by removing this explicit type in favor of the other more specific one.
        composition.types.splice(i, 1);
        i--;
      }
    }

    if (composition.types.length == 1) {
      OmniUtil.swapType(model, composition, composition.types[0], 10);
    }

    return model;
  }
}
