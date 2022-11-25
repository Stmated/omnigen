import {
  CompositionKind,
  OmniCompositionType,
  OmniInterfaceType,
  OmniModel,
  OmniModelTransformer,
  OmniSubtypeCapableType,
  OmniSuperTypeCapableType,
  OmniType,
  OmniTypeKind,
  OmniUtil,
  RealOptions,
  TargetOptions,
} from '@omnigen/core';
import {JavaUtil} from '../../util/index.js';

/**
 * Checks for object types that are used as interfaces, and splits the type into two types.
 * One that is the original, and one that is the interface version, pointing to the original.
 * It then replaces the types where needed.
 */
export class InterfaceJavaModelTransformer implements OmniModelTransformer<TargetOptions> {

  transformModel(model: OmniModel, _options: RealOptions<TargetOptions>): void {

    const exportableTypes = OmniUtil.getAllExportableTypes(model, model.types);

    const interfaceMap = new Map<OmniType, OmniInterfaceType>();

    for (const type of exportableTypes.all) {

      const typeAsInterface = JavaUtil.getAsInterface(model, type);
      if (!typeAsInterface) {
        continue;
      }

      const subTypesThatImplementUs = JavaUtil.getSubTypesOfInterface(model, typeAsInterface);
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

          // TODO: We need to create an interface version of ALL types that inheritableType inherit from
          //        This is because an interface cannot extend a class, they can only inherit from other interfaces

          // TODO: We should make ALL the inheritableType extend from its interface type.
          //        This is in a way an endless recursion, but we just have to stay vigilant
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
      // TODO: This is bad; should be able to give an object like {prefix: ..., suffix: ...} and resolve later
      of: type,
    };

    if ('extendedBy' in type) {
      this.addInterfaceToOriginalType(type, interfaceType);
    }

    interfaceMap.set(type, interfaceType);
    return [interfaceType, 'new'];
  }

  private addInterfaceToOriginalType(type: OmniSubtypeCapableType, interfaceType: OmniInterfaceType): void {

    // NOTE: Should we actually unwrap here? Should we not want it to stay as the external reference type?
    // type = OmniUtil.getUnwrappedType(type);
    if (type.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      throw new Error(`Do not know how to handle interface modification of external reference types`);
    } else if (type.extendedBy) {

      // There already exist an extension, so we need to add to it.
      if (type.extendedBy.kind == OmniTypeKind.COMPOSITION && type.extendedBy.compositionKind == CompositionKind.AND) {

        // It is already an AND, that makes it a bit easy.
        type.extendedBy.types.push(interfaceType);

      } else {

        // It is not extended by a composition, or a composition that is not AND, so we will make it one.
        const originalExtension = type.extendedBy;
        const composition: OmniCompositionType<OmniSuperTypeCapableType, CompositionKind> = {
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          types: [
            originalExtension,
            interfaceType,
          ],
        };

        type.extendedBy = composition;
      }

    } else {

      // There is no other extension, so we just add this.
      type.extendedBy = interfaceType;
    }
  }
}
