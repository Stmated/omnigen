import {
  OmniCompositionType, OmniExclusiveUnionType, OmniIntersectionType,
  OmniModel,
  OmniModel2ndPassTransformer,
  OmniModelTransformer,
  OmniModelTransformer2ndPassArgs,
  OmniModelTransformerArgs,
  OmniType,
  OmniTypeKind, OmniUnionType,
  ParserOptions,
  TypeOwner,
} from '@omnigen/core';
import {OmniUtil} from '../OmniUtil.ts';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Takes an OmniModel and tries to simplify the inheritance hierarchy non-destructively.
 * It does this by seeing if types have common ancestors and skipping the superfluously stated ones.
 */
export class SimplifyInheritanceModelTransformer implements OmniModelTransformer, OmniModel2ndPassTransformer {

  transformModel(args: OmniModelTransformerArgs<ParserOptions>): void {

    if (!args.options.simplifyTypeHierarchy) {

      // We will not simplify the types, for some reason. This transformer should be non-destructive/lossless.
      return;
    }

    OmniUtil.visitTypesDepthFirst(args.model, ctx => {
      if (OmniUtil.isComposition(ctx.type)) {
        SimplifyInheritanceModelTransformer.simplifyComposition(args.model, ctx.type, ctx.parent);
      }
    });
  }

  transformModel2ndPass(args: OmniModelTransformer2ndPassArgs) {

    if (args.targetFeatures.primitiveInheritance) {
      return;
    }

    logger.trace(`Language does not support primitive inheritance, so will look for replacements. Looking inside '${args.model.name}'`);

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
    parent: TypeOwner | undefined,
  ): void {

    if (composition.kind == OmniTypeKind.INTERSECTION) {
      SimplifyInheritanceModelTransformer.simplifyIntersection(composition, model, parent);
    } else if (OmniUtil.isUnion(composition)) {
      SimplifyInheritanceModelTransformer.simplifyUnion(composition);
    }
  }

  private static simplifyUnion(composition: OmniUnionType | OmniExclusiveUnionType) {

    if (composition.types.length === 2) {
      for (let i = 0; i < composition.types.length; i++) {

        const type = OmniUtil.getUnwrappedType(composition.types[i]);
        if (OmniUtil.isNull(type)) {

          // One of the union members is `null` -- it can be removed and instead the other type can be made nullable.
          const otherIndex = (i === 0) ? 1 : 0;
          const otherType = composition.types[otherIndex];
          const otherUnwrappedType = OmniUtil.getUnwrappedType(otherType);

          composition.types.splice(i, 1);

          if (!OmniUtil.isNullableType(otherUnwrappedType)) {
            composition.types[0] = OmniUtil.toReferenceType(otherType);
          }

          return;
        }
      }
    }
  }

  private static simplifyIntersection(composition: OmniIntersectionType, model: OmniModel, parent: TypeOwner | undefined) {

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

      // Could we do something here? Replace the composition with the lone type.
      if (parent) {
        OmniUtil.swapType(parent, composition, composition.types[0], 1);
      }
    }
  }
}
