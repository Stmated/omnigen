import {OmniModelTransformer} from '@parse/OmniModelTransformer';
import {OmniClassType, OmniModel, OmniTypeKind} from '@parse';
import {DependencyGraph} from '@parse/DependencyGraphBuilder';

/**
 * Takes an OmniModel, and tries to modify it to use generics where possible.
 * This will remove the need for a lot of extra types, and make code more readable.
 */
export class GenericOmniModelTransformer implements OmniModelTransformer {

  transform(model: OmniModel, dependencies: DependencyGraph): void {

    // Go through all types.
    // If many types have the exact same properties with the same names
    // But if the only thing differing are the types, then replace with generic source and target types.

    const similarClasses = new Map<string, OmniClassType[]>();
    for (const e of dependencies.uses.entries()) {

      const type = e[0];
      const uses = e[1];

      if (type.kind == OmniTypeKind.OBJECT && type.extendedBy) {

        //const signatureExtended =
        const signature = `${(type.properties || []).map(it => it.name).join(',')}`;

        let types = similarClasses.get(signature);
        if (!types) {
          types = [];
          similarClasses.set(signature, types);
        }
        types.push(type);
      }
    }

    for (const e of similarClasses.entries()) {

      const signature = e[0];
      const types = e[1];


    }
  }
}
