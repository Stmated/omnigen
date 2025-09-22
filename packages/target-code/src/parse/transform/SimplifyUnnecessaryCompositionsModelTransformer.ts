import {
  OMNI_GENERIC_FEATURES,
  OmniCompositionType,
  OmniExclusiveUnionType, OmniIntersectionType,
  OmniModelTransformer,
  OmniModelTransformerArgs,
  OmniNode,
  OmniType,
  OmniTypeKind,
  OmniUnionType,
  TargetFeatures,
} from '@omnigen/api';
import {isDefined, OmniUtil, ProxyReducerOmni2, ProxyReducerArg2, Naming} from '@omnigen/core';

/**
 * These are examples of unions that we will simplify/remove.
 * <ul>
 *   <li>`string | string` to `string`</li>
 * </ul>
 */
export class SimplifyUnnecessaryCompositionsModelTransformer implements OmniModelTransformer {

  transformModel(args: OmniModelTransformerArgs): void {

    const features = OMNI_GENERIC_FEATURES; // TODO: Make this use impl like JAVA_FEATURES -- need to move to 2nd pass?

    if (!args.options.simplifyTypeHierarchy) {
      return;
    }

    args.model = ProxyReducerOmni2.builder().reduce(args.model, {}, {
      UNION: (_, r) => {
        const reduced = r.yieldBase();
        let newChildren: OmniType[] | undefined = undefined;
        if (OmniUtil.isComposition(reduced)) {
          newChildren = this.simplifyCombos(reduced);
          if (newChildren) {
            r.put('types', newChildren);
          }
        }

        const merged = this.maybeReduce(reduced, newChildren, features);
        if (merged) {
          r.replace(merged);
        }
      },
      EXCLUSIVE_UNION: (_, r) => {
        const reduced = r.yieldBase();
        let newChildren: OmniType[] | undefined = undefined;
        if (OmniUtil.isComposition(reduced)) {
          newChildren = this.simplifyCombos(reduced);
          if (newChildren) {
            r.put('types', newChildren);
          }
        }

        const merged = this.maybeReduce(reduced, newChildren, features);
        if (merged) {
          r.replace(merged);
        }
      },
      INTERSECTION: (_, r) => {
        const reduced = r.yieldBase();
        let newChildren: OmniType[] | undefined = undefined;
        if (OmniUtil.isComposition(reduced)) {
          newChildren = this.simplifyCombos(reduced, r.parent);
          if (newChildren) {
            r.put('types', newChildren);
          }
        }

        if (reduced && OmniUtil.isComposition(reduced)) {
          const currentChildren = newChildren ?? reduced.types;
          if (currentChildren.length === 1) {

            const replacement = currentChildren[0];

            // NOTE: It is not certain that this is correct, since the child could be used in multiple places and we'd keep overwriting with new meta/names.
            //        But for now this is usually the correct decision. We should create a "usage map" though and only do this copying if it is used once.
            //        (or decide what to do about it if it is used multiple times, maybe create a new unique name so its "nameability" is kept the same)
            // TODO: Try to implement/safeguard against the situation above
            OmniUtil.mergeTypeMeta(reduced, replacement, false, false, true);
            if (OmniUtil.isNameable(replacement) && !replacement.name) {
              OmniUtil.copyName(reduced, replacement);
            }

            // if (reduced.inline !== true && Naming.getName(replacement)) {
            //   replacement.inline = reduced.inline ?? false;
            // }

            r.replace(replacement);
          }
        }
      },
    });
  }

  private simplifyCombos(reduced: OmniCompositionType, parent?: OmniNode) {
    const newChildren: OmniType[] = [...reduced.types];
    for (let i = 0; i < newChildren.length; i++) {
      const child = newChildren[i];
      if (child.kind === reduced.kind && !child.name) {
        newChildren.splice(i, 1, ...child.types);
        i--;
      }

      if (parent && parent.kind === OmniTypeKind.OBJECT && child.kind === OmniTypeKind.OBJECT && OmniUtil.isEmptyType(child)) {
        newChildren.splice(i, 1);
        i--;
      }
    }

    if (newChildren.length === reduced.types.length) {
      return undefined;
    }

    return newChildren;
  }

  private maybeReduce(
    n: OmniType | undefined,
    newChildren: OmniType[] | undefined,
    features: TargetFeatures,
  ): OmniType | undefined {

    if (!n || !OmniUtil.isUnion(n)) {
      return undefined;
    }

    const currentChildren = newChildren ?? n.types;
    if (currentChildren.length === 1) {

      if (OmniUtil.hasMeta(n)) {

        // The composition/owner has meta information. Need to create r new type.
        const target = {...currentChildren[0]};
        OmniUtil.mergeTypeMeta(n, target, false, false, true);
        return target;

      } else {

        // We can just return the single child.
        return currentChildren[0];
      }
    }

    const distinctTypes = OmniUtil.getDistinctTypes(currentChildren, features);
    if (distinctTypes.length === 1) {
      return this.mergeTypes(n, currentChildren, features);
    }

    return undefined;
  }

  mergeTypes(original: OmniType, types: OmniType[], features: TargetFeatures): OmniType {

    let target = {...types[0]};
    OmniUtil.mergeTypeMeta(original, target, false, false, true);
    OmniUtil.copyName(original, target);

    for (let i = 1; i < types.length; i++) {
      target = OmniUtil.mergeType(types[i], target, features, true, true);
    }

    OmniUtil.copyName(original, target);
    for (let i = 0; i < types.length; i++) {
      OmniUtil.mergeTypeMeta(types[i], target, false, true);
    }

    return target;
  }
}
