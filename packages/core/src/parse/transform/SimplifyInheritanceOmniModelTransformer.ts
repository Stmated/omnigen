import {
  CompositionKind,
  OmniCompositionType,
  OmniModel,
  OmniModelTransformer, OmniType,
  OmniTypeKind,
  OmniUtil, TypeOwner,
} from '../../parse';
import {RealOptions} from '../../options';
import {TargetOptions} from '../../interpret';

/**
 * Takes an OmniModel and tries to simplify the inheritance hierarchy non-destructively.
 * It does this by seeing if types have common ancestors and skipping the superfluously stated ones.
 */
export class SimplifyInheritanceOmniModelTransformer implements OmniModelTransformer<TargetOptions> {

  transformModel(model: OmniModel, options: RealOptions<TargetOptions>): void {

    if (!options.simplifyTypeHierarchy) {

      // We will not simplify the types, for some reason. This transformer should be non-destructive/lossless.
      return;
    }

    OmniUtil.visitTypesDepthFirst(model, ctx => {
      if (ctx.type.kind == OmniTypeKind.COMPOSITION) {
        SimplifyInheritanceOmniModelTransformer.simplifyComposition(model, ctx.type, ctx.parent);
      }
    });
  }

  private static simplifyComposition(
    model: OmniModel,
    composition: OmniCompositionType<OmniType, CompositionKind>,
    parent: TypeOwner<OmniType> | undefined,
  ): void {

    if (composition.compositionKind == CompositionKind.AND) {

      // If the composition is an AND, there might be paths that have overlapping supertypes.
      // We should try to resolve and simplify if any of the types are superfluous.

      // JavaUtil.getMostCommonTypeInHierarchies()

      const hierarchies: OmniType[][] = [];
      for (let i = 0; i < composition.types.length; i++) {

        const hierarchy = OmniUtil.getSuperTypeHierarchy(model, OmniUtil.asSubType(composition.types[i]));
        if (hierarchy.length > 0) {
          hierarchies.push(hierarchy);
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

        // const currentAsSub = JavaUtil.asSubType(composition.types[i]);
        // const nextAsSub = JavaUtil.asSubType(composition.types[i + 1]);
        //
        // if (currentAsSub && nextAsSub) {
        //
        //   const common = JavaUtil.getCommonSuperClasses(model, currentAsSub, nextAsSub);
        //
        // }
      }

      if (composition.types.length == 1) {

        // Could we do something here? Replace the composition with the lone type.
        if (parent) {
          OmniUtil.swapType(parent, composition, composition.types[0], 1);
        }
      }
    }
  }
}
