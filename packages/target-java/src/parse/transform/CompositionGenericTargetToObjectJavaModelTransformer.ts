import {OmniCompositionType, OmniModelTransformer, OmniModelTransformerArgs, OmniObjectType, OmniSuperTypeCapableType, OmniType, OmniTypeKind} from '@omnigen/api';
import {OmniUtil} from '@omnigen/core';
import {JavaUtil} from '../../util';

/**
 * Checks if there are composition types inside the model which must be elevated to become enveloped in an object to be legal in Java.
 *
 * Examples are:
 * * When a generic target is a composition, which would mean that we do not have any concrete implementation that can handle things like deserialization.
 *
 * NOTE:
 * * This could likely be moved to be a 2nd pass transformer and add a flag to TargetFeature
 */
export class CompositionGenericTargetToObjectJavaModelTransformer implements OmniModelTransformer {

  private _counter = 0;

  transformModel(args: OmniModelTransformerArgs): void {

    const map = new Map<OmniType, OmniType>();

    OmniUtil.visitTypesDepthFirst(args.model, args => {

      const parent = args.parent;
      const type = args.type;

      if (parent && parent.kind === OmniTypeKind.GENERIC_TARGET_IDENTIFIER && OmniUtil.isComposition(type)) {

        let newType: OmniType | undefined = map.get(type);
        if (!newType) {
          newType = this.createNewConcreteObjectFromComposition(parent, type);
          map.set(type, newType);
        }

        parent.type = newType;
      }
    });
  }

  private createNewConcreteObjectFromComposition(parent: OmniType, type: OmniCompositionType): OmniType {

    if (type.kind === OmniTypeKind.EXCLUSIVE_UNION) {

      // If it is an XOR composition, then return it as-is, since it will be its own object in Java.
      // Someday this whole XOR composition stuff needs to be overhauled, because it is brittle and too hard-coded.
      return type;
    }

    const superTypeComposition: OmniCompositionType<OmniSuperTypeCapableType, typeof type.kind> = {
      ...type,
      types: [],
    };

    for (const composed of type.types) {

      if (!JavaUtil.asSuperType(composed)) {
        throw new Error(
          `Not allowed '${OmniUtil.describe(composed)}' of '${OmniUtil.describe(parent)}' as a ${type.kind}-composition entry since it must be super-type compatible`,
        );
      }

      superTypeComposition.types.push(composed);
    }

    // Move the name to the new object, and remove the name from the composition, or it will likely clash.
    const copiedName = superTypeComposition.name;
    if (!copiedName) {
      throw new Error(`There was no name available for generic composition replacement on '${OmniUtil.describe(superTypeComposition)}'`);
    }

    delete superTypeComposition.name;

    return {
      kind: OmniTypeKind.OBJECT,
      name: copiedName,
      properties: [],
      extendedBy: superTypeComposition,
      debug: `#${this._counter++} Created from CompositionGenericTarget (${copiedName}) -> Object`,
    } satisfies OmniObjectType;
  }
}
