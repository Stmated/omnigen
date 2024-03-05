import {OmniCompositionType, OmniModelTransformer, OmniModelTransformerArgs, OmniObjectType, OmniSuperTypeCapableType, OmniType, OmniTypeKind, ParserOptions} from '@omnigen/core';
import {OmniUtil} from '@omnigen/core-util';
import {JavaUtil} from '../../util';

/**
 * Checks if there are composition types inside the model which must be elevated to become enveloped in an object to be legal in Java.
 *
 * Examples are:
 * * When a generic target is a composition, which would mean that we do not have any concrete implementation that can handle things like deserialization.
 */
export class CompositionGenericTargetToObjectJavaModelTransformer implements OmniModelTransformer {

  private _counter = 0;


  transformModel(args: OmniModelTransformerArgs<ParserOptions>): void {

    const map = new Map<OmniType, OmniType>();

    OmniUtil.visitTypesBreadthFirst(args.model, args => {

      const parent = args.owner;
      const type = args.type;

      if (parent && 'kind' in parent && parent.kind == OmniTypeKind.GENERIC_TARGET_IDENTIFIER && type.kind == OmniTypeKind.COMPOSITION) {

        let newType: OmniType | undefined = map.get(type);
        if (!newType) {
          const superTypeComposition: OmniCompositionType<OmniSuperTypeCapableType, typeof type.compositionKind> = {
            ...type,
            types: [],
          };

          for (const composed of type.types) {

            const asSuperType = JavaUtil.asSuperType(composed);
            if (!asSuperType) {
              throw new Error(`Not allowed to have type ${OmniUtil.describe(composed)}' as a ${type.compositionKind}-composition when it needs to be able to be a super-type`);
            }

            superTypeComposition.types.push(asSuperType);
          }

          // Move the name to the new object, and remove the name from the composition, or it will likely clash.
          const copiedName = superTypeComposition.name;
          if (!copiedName) {
            throw new Error(`There was no name available for generic composition replacement on '${OmniUtil.describe(superTypeComposition)}'`);
          }

          delete superTypeComposition.name;

          newType = {
            kind: OmniTypeKind.OBJECT,
            name: copiedName,
            properties: [],
            extendedBy: superTypeComposition,
            debug: `#${this._counter++} Created from CompositionGenericTarget (${copiedName}) -> Object`,
          } satisfies OmniObjectType;

          map.set(type, newType);
        }

        parent.type = newType;
      }
    }, false);
  }
}
