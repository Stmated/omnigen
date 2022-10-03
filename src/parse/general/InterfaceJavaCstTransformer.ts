import {
  CompositionKind,
  OmniCompositionType,
  OmniInheritableType,
  OmniInterfaceType,
  OmniModel,
  OmniObjectType,
  OmniType,
  OmniTypeKind
} from '@parse';
import {OmniModelTransformer} from '@parse/OmniModelTransformer';
import {JavaDependencyGraph} from '@java/JavaDependencyGraph';
import {DEFAULT_GRAPH_OPTIONS, DependencyGraphBuilder} from '@parse/DependencyGraphBuilder';
import {OmniUtil} from '@parse/OmniUtil';
import {RealOptions} from '@options';
import {ITargetOptions} from '@interpret';

/**
 * Checks for object types that are used as interfaces, and splits the type into two types.
 * One that is the original, and one that is the interface version, pointing to the original.
 * It then replaces the types where needed.
 */
export class InterfaceJavaCstTransformer implements OmniModelTransformer<ITargetOptions> {

  transformModel(model: OmniModel, options: RealOptions<ITargetOptions>): void {

    const exportableTypes = OmniUtil.getAllExportableTypes(model, model.types);
    const graph = DependencyGraphBuilder.build(exportableTypes.all, DEFAULT_GRAPH_OPTIONS);

    const interfaceMap = new Map<OmniType, OmniInterfaceType>();

    for (const type of exportableTypes.all) {

      const inheritableType = OmniUtil.asInheritableType(type);
      if (!inheritableType) {
        continue;
      }

      const typesThatImplementUs = JavaDependencyGraph.getTypesThatImplement(graph, inheritableType);
      if (typesThatImplementUs.length > 0) {

        // This type is used as an interface in the model.
        // For some languages it is supported to have multiple inheritances.
        // But for Java and other Object Oriented languages, we need to change the type into an interface.

        const [interfaceType, existedOrNew] = this.getOrCreateInterfaceType(inheritableType, interfaceMap);
        if (existedOrNew == 'existed') {
          continue;
        }

        if (inheritableType.kind == OmniTypeKind.COMPOSITION) {
          // If it is a composition, then add it as an "AND" if it not there
        } else if (inheritableType.kind == OmniTypeKind.OBJECT) {

          // If it is an an object, change it into a composite and add it as an AND
        } else if (inheritableType.kind == OmniTypeKind.GENERIC_TARGET) {

          // ???
        }

        // Now let's replace all the types that inherit from this object with the new interface type.
        for (const implementor of typesThatImplementUs) {

          if (implementor.kind == OmniTypeKind.COMPOSITION && implementor.compositionKind == CompositionKind.XOR) {
            // Do NOT replace the implementation type with the interface type.
            // This will make the payloads not deserializable by the manual deserialization.
            continue;
          }

          // We only swap the DIRECT depended types.
          // NOTE: This might be incorrect. Will notice how it feels/looks after a few examples.
          OmniUtil.swapType(implementor, inheritableType, interfaceType, 1);

          // TODO: We need to create an interface version of ALL types that inheritableType inherit from
          //        This is because an interface cannot extend a class, they can only inherit from other interfaces

          // TODO: We should make ALL the inheritableType extend from its interface type.
          //        This is in a way an endless recursion, but we just have to stay vigilant
        }
      }
    }
  }

  private getOrCreateInterfaceType(
    type: OmniInheritableType,
    interfaceMap: Map<OmniType, OmniInterfaceType>
  ): [OmniInterfaceType, 'existed' | 'new'] {

    const existing = interfaceMap.get(type);
    if (existing) {
      return [existing, 'existed'];
    }

    const interfaceType: OmniInterfaceType = {
      kind: OmniTypeKind.INTERFACE,
      of: type,
    };

    if ('extendedBy' in type) {
      this.addInterfaceToOriginalType(type, interfaceType);
    }

    interfaceMap.set(type, interfaceType);
    return [interfaceType, 'new'];
  }

  private addInterfaceToOriginalType(type: OmniObjectType | OmniInterfaceType, interfaceType: OmniInterfaceType): void {

    if (type.extendedBy) {

      // There already exist an extension, so we need to add to it.
      if (type.extendedBy.kind == OmniTypeKind.COMPOSITION && type.extendedBy.compositionKind == CompositionKind.AND) {

        // It is already an AND, that makes it a bit easy.
        type.extendedBy.andTypes.push(interfaceType);

      } else {

        // It is not extended by a composition, or a composition that is not AND, so we will make it one.
        const originalExtension = type.extendedBy;
        const composition: OmniCompositionType = {
          kind: OmniTypeKind.COMPOSITION,
          compositionKind: CompositionKind.AND,
          andTypes: [
            originalExtension,
            interfaceType
          ]
        };

        type.extendedBy = composition;
      }

    } else {

      // There is no other extension, so we just add this.
      type.extendedBy = interfaceType;
    }
  }
}
