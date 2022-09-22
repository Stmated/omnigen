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
import {JavaOptions} from '@java';
import {OmniModelTransformer} from '@parse/OmniModelTransformer';
import {JavaDependencyGraph} from '@java/JavaDependencyGraph';
import {DEFAULT_GRAPH_OPTIONS, DependencyGraphBuilder} from '@parse/DependencyGraphBuilder';
import {OmniModelUtil} from '@parse/OmniModelUtil';

/**
 * Checks for object types that are used as interfaces, and splits the type into two types.
 * One that is the original, and one that is the interface version, pointing to the original.
 * It then replaces the types where needed.
 */
export class InterfaceJavaCstTransformer implements OmniModelTransformer<JavaOptions> {

  transformModel(model: OmniModel, options: JavaOptions): void {

    const exportableTypes = OmniModelUtil.getAllExportableTypes(model, model.types);
    const graph = DependencyGraphBuilder.build(exportableTypes.all, DEFAULT_GRAPH_OPTIONS);

    const interfaceMap = new Map<OmniType, OmniInterfaceType>();

    for (const type of exportableTypes.all) {

      const inheritableType = OmniModelUtil.asInheritableType(type);
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
          InterfaceJavaCstTransformer.swapType(implementor, inheritableType, interfaceType, 1);

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

  /**
   * Iterates through a type and all its related types, and replaces all found needles with the given replacement.
   *
   * TODO: Implement a general way of traversing all the types, so we do not need to duplicate this functionality everywhere!
   * TODO: This feels very inefficient right now... needs a very good revamp
   */
  public static swapType<T extends OmniType, R extends OmniType>(root: OmniType, needle: T, replacement: R, maxDepth: number): R | undefined {

    if (root == needle) {
      return replacement;
    }

    if (maxDepth == 0) {
      return undefined;
    }

    if (root.kind == OmniTypeKind.COMPOSITION) {

      let types: OmniType[];
      switch (root.compositionKind) {
        case CompositionKind.AND:
          types = root.andTypes;
          break;
        case CompositionKind.OR:
          types = root.orTypes;
          break;
        case CompositionKind.XOR:
          types = root.xorTypes;
          break;
        case CompositionKind.NOT:
          types = root.notTypes;
          break;
      }

      for (let i = 0; i < types.length; i++) {
        const found = InterfaceJavaCstTransformer.swapType(types[i], needle, replacement, maxDepth - 1);
        if (found) {
          types.splice(i, 1, replacement);
        }
      }
    } else if (root.kind == OmniTypeKind.OBJECT) {
      if (root.extendedBy) {
        const found = InterfaceJavaCstTransformer.swapType(root.extendedBy, needle, replacement, maxDepth - 1);
        if (found) {
          const inheritableReplacement = OmniModelUtil.asInheritableType(replacement);
          if (!inheritableReplacement) {
            throw new Error(`Not allowed to use '${OmniModelUtil.getTypeDescription(replacement)}' as extendable type`);
          }

          root.extendedBy = inheritableReplacement;
        }
      }

      for (const property of root.properties) {
        const found = InterfaceJavaCstTransformer.swapType(property.type, needle, replacement, maxDepth - 1);
        if (found) {
          property.type = replacement;
        }
      }
    } else if (root.kind == OmniTypeKind.INTERFACE) {
      const inheritableReplacement = OmniModelUtil.asInheritableType(replacement);
      if (inheritableReplacement) {
        const found = InterfaceJavaCstTransformer.swapType(root.of, needle, inheritableReplacement, maxDepth - 1);
        if (found) {
          root.of = inheritableReplacement;
        }
      } else {
        throw new Error(`Cannot replace, since the interface requires a replacement that is inheritable`);
      }
    } else if (root.kind == OmniTypeKind.GENERIC_TARGET) {

      for (let i = 0; i < root.targetIdentifiers.length; i++) {
        const identifier = root.targetIdentifiers[i];
        const found = InterfaceJavaCstTransformer.swapType(identifier.type, needle, replacement, maxDepth - 1);
        if (found) {
          identifier.type = found;
        }
      }

      const found = InterfaceJavaCstTransformer.swapType(root.source, needle, replacement, maxDepth - 1);
      if (found) {
        if (found.kind == OmniTypeKind.GENERIC_SOURCE) {
          root.source = found;
        } else {
          throw new Error(`Cannot replace, since it must be a generic source`);
        }
      }

    } else if (root.kind == OmniTypeKind.GENERIC_SOURCE) {

      for (let i = 0; i < root.sourceIdentifiers.length; i++) {
        const identifier = root.sourceIdentifiers[i];
        if (identifier.lowerBound) {
          const found = InterfaceJavaCstTransformer.swapType(identifier.lowerBound, needle, replacement, maxDepth - 1);
          if (found) {
            identifier.lowerBound = found;
          }
        }
        if (identifier.upperBound) {
          const found = InterfaceJavaCstTransformer.swapType(identifier.upperBound, needle, replacement, maxDepth - 1);
          if (found) {
            identifier.upperBound = found;
          }
        }
      }

      const found = InterfaceJavaCstTransformer.swapType(root.of, needle, replacement, maxDepth - 1);
      if (found) {
        if (found.kind == OmniTypeKind.OBJECT) {
          root.of = found;
        } else {
          throw new Error(`Cannot replace, since the replacement has to be an object`);
        }
      }
    } else if (root.kind == OmniTypeKind.DICTIONARY) {

      const foundKey = InterfaceJavaCstTransformer.swapType(root.keyType, needle, replacement, maxDepth - 1);
      if (foundKey) {
        root.keyType = foundKey;
      }

      const foundValue = InterfaceJavaCstTransformer.swapType(root.valueType, needle, replacement, maxDepth - 1);
      if (foundValue) {
        root.valueType = foundValue;
      }
    } else if (root.kind == OmniTypeKind.ARRAY_TYPES_BY_POSITION) {
      for (let i = 0; i < root.types.length; i++) {
        const found = InterfaceJavaCstTransformer.swapType(root.types[i], needle, replacement, maxDepth - 1);
        if (found) {
          root.types.splice(i, 1, found);
        }
      }
    } else if (root.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      for (const property of root.properties) {
        const found = InterfaceJavaCstTransformer.swapType(property.type, needle, replacement, maxDepth - 1);
        if (found) {
          property.type = found;
        }
      }
    } else if (root.kind == OmniTypeKind.ARRAY) {
      const found = InterfaceJavaCstTransformer.swapType(root.of, needle, replacement, maxDepth - 1);
      if (found) {
        root.of = found;
      }
    }

    return undefined;
  }
}
