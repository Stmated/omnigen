import {
  CompositionKind,
  OmniInterfaceType,
  OmniModelTransformer,
  OmniModelTransformerArgs,
  OmniSubTypeCapableType,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  ParserOptions,
} from '@omnigen/core';
import {JavaUtil} from '../../util/index.ts';
import {OmniUtil} from '@omnigen/core-util';

/**
 * Checks for object types that are used as interfaces, and splits the type into two types.
 * One that is the original, and one that is the interface version, pointing to the original.
 * It then replaces the types where needed.
 */
export class InterfaceJavaModelTransformer implements OmniModelTransformer {

  transformModel(args: OmniModelTransformerArgs<ParserOptions>): void {

    const exportableTypes = OmniUtil.getAllExportableTypes(args.model, args.model.types);

    const interfaceMap = new Map<OmniType, OmniInterfaceType>();

    for (const type of exportableTypes.all) {

      const typeAsInterface = JavaUtil.getAsInterface(args.model, type);
      if (!typeAsInterface) {
        continue;
      }

      const subTypesThatImplementUs = JavaUtil.getSubTypesOfInterface(args.model, typeAsInterface);
      if (subTypesThatImplementUs.length > 0) {

        // This type is used as an interface in the model.
        // For some languages it is supported to have multiple inheritances.
        // But for Java and other Object Oriented languages, we need to change the type into an interface.

        const [interfaceType, existedOrNew] = this.getOrCreateInterfaceType(typeAsInterface, interfaceMap);
        if (existedOrNew == 'existed') {
          continue;
        }

        // Now let's replace all the types that inherit from this object with the new interface type.
        for (const implementor of subTypesThatImplementUs) {

          // We only swap the DIRECT depended types.
          // NOTE: This might be incorrect. Will notice how it feels/looks after a few examples.
          OmniUtil.swapType(implementor, typeAsInterface, interfaceType, 1);
        }
      }
    }
  }

  private getOrCreateInterfaceType(
    type: OmniSuperTypeCapableType,
    interfaceMap: Map<OmniType, OmniInterfaceType>,
  ): [OmniInterfaceType, 'existed' | 'new'] {

    const existing = interfaceMap.get(type);
    if (existing) {
      return [existing, 'existed'];
    }

    const interfaceType: OmniInterfaceType = {
      kind: OmniTypeKind.INTERFACE,
      of: type,
      debug: `Created because '${OmniUtil.describe(type)}' uses the type as an interface`,
    };

    this.addInterfaceToOriginalType(type, interfaceType);

    interfaceMap.set(type, interfaceType);
    return [interfaceType, 'new'];
  }

  private addInterfaceToOriginalType(type: OmniType, interfaceType: OmniInterfaceType): void {

    // NOTE: Should we actually unwrap here? Should we not want it to stay as the external reference type?
    // type = OmniUtil.getUnwrappedType(type);
    if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      throw new Error(`Do not know how to handle interface modification of external reference types`);
    } else if ('extendedBy' in type || type.kind == OmniTypeKind.OBJECT) {

      if (type.extendedBy) {

        // There already exist an extension, so we need to add to it.
        if (type.extendedBy.kind == OmniTypeKind.COMPOSITION && type.extendedBy.compositionKind == CompositionKind.AND) {

          // It is already an AND, that makes it a bit easy.
          type.extendedBy.types.push(interfaceType);

        } else {

          // It is not extended by a composition, or a composition that is not AND, so we will make it one.
          const originalExtension = type.extendedBy;
          type.extendedBy = {
            kind: OmniTypeKind.COMPOSITION,
            compositionKind: CompositionKind.AND,
            types: [
              originalExtension,
              interfaceType,
            ],
          };
        }

      } else {

        // There is no other extension, so we just add this.
        type.extendedBy = interfaceType;
      }
    }
  }
}
