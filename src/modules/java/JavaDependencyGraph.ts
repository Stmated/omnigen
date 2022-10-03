import {CompositionKind, OmniInheritableType, OmniObjectType, OmniType, OmniTypeKind} from '@parse';
import {DependencyGraph} from '@parse/DependencyGraphBuilder';
import {LoggerFactory} from '@util';
import {OmniUtil} from '@parse/OmniUtil';

export const logger = LoggerFactory.create(__filename);

export type SuperMatchesCallback = { (classType: OmniObjectType): boolean};

/**
 * TODO: This class sucks -- it feels like pre-optimization, and just makes things more complex than they need to be
 */
export class JavaDependencyGraph {

  public static isInterface(graph: DependencyGraph, type: OmniType): boolean {
    return graph.interfaces.includes(type);
  }

  public static isClass(graph: DependencyGraph, type: OmniType): boolean {
    return !JavaDependencyGraph.isInterface(graph, type);
  }

  public static getExtends(graph: DependencyGraph, type: OmniInheritableType): OmniInheritableType | undefined {

    if (type.kind == OmniTypeKind.COMPOSITION && type.compositionKind == CompositionKind.XOR) {
      // The XOR composition class does in Java not actually extend anything.
      // Instead it solves things by becoming a manual mapping class with different getters.
      return undefined;
    }

    const uses = graph.uses.get(type);
    if (uses) {
      for (const use of uses) {
        if (!JavaDependencyGraph.isClass(graph, use)) {
          continue;
        }

        if (use.kind == OmniTypeKind.OBJECT || use.kind == OmniTypeKind.GENERIC_TARGET || use.kind == OmniTypeKind.ENUM) {
          return use;
        }
        if (use.kind == OmniTypeKind.COMPOSITION && use.compositionKind == CompositionKind.XOR) {

          // If the supertype is an XOR, then we should allow it to be extended
          return use;
        }

        const inheritor = OmniUtil.getTypeDescription(type);
        const inherited = OmniUtil.getTypeDescription(use);
        throw new Error(`Told '${inheritor}' inherit '${inherited}', but was not found in dependency graph`);
      }
    }

    return undefined;
  }

  public static getImplements(graph: DependencyGraph, type: OmniInheritableType): OmniType[] {

    const interfaces: OmniType[] = [];
    if (type.kind == OmniTypeKind.COMPOSITION && type.compositionKind == CompositionKind.XOR) {
      // The XOR composition class does in Java not actually implement anything.
      // Instead it solves things by becoming a manual mapping class with different getters.
      return interfaces;
    }

    const uses = graph.uses.get(type);
    if (uses) {
      for (const use of uses) {
        if (JavaDependencyGraph.isInterface(graph, use)) {
          interfaces.push(use);
        }
      }
    }

    return interfaces;
  }

  /**
   * Get the types that implement the given class.
   * There is a difference between implementing (interface) and extending (class)
   *
   * @param graph
   * @param type
   */
  public static getTypesThatImplement(graph: DependencyGraph, type: OmniInheritableType): OmniType[] {

    const interfaces: OmniType[] = [];
    if (JavaDependencyGraph.isInterface(graph, type)) {
      for (const e of graph.uses.entries()) {
        if (e[0].kind == OmniTypeKind.COMPOSITION && e[0].compositionKind == CompositionKind.XOR) {
          // In Java this is not a thing, and we need to not count it as such.
          // TODO: Need to generalize the dependency graph more, so it's easier to understand.
          //        Saying it is an interface, but then not using it as an interface, is just WEIRD.
          continue;
        }

        if (e[1].includes(type)) {
          interfaces.push(e[0]);
        }
      }
    }

    return interfaces;
  }

  public static superMatches(
    graph: DependencyGraph,
    type: OmniObjectType,
    callback: SuperMatchesCallback
  ): boolean {

    let pointer: OmniInheritableType | undefined = type;
    while (pointer = JavaDependencyGraph.getExtends(graph, pointer)) {
      // const unwrapped = OmniUtil.getUnwrappedType(pointer);
      // const unwrappedInheritable = OmniUtil.asInheritableType(unwrapped);
      // if (!unwrappedInheritable) {
      //   throw new Error(`Something is weird with the inheritable types`);
      // }

      if (this.checkTypeAndCallback(pointer, callback)) {
        return true;
      }
    }

    return false;
  }

  private static checkTypeAndCallback(pointer: OmniInheritableType, callback: SuperMatchesCallback): boolean {

    // TODO: Is this even correct?
    if (pointer.kind == OmniTypeKind.GENERIC_TARGET) {
      if (callback(pointer.source.of)) {
        return true;
      }
    } else if (pointer.kind == OmniTypeKind.COMPOSITION) {
      // ???
    } else if (pointer.kind == OmniTypeKind.ENUM) {
      // ???
    } else if (pointer.kind == OmniTypeKind.INTERFACE) {
      // ???
    } else if (pointer.kind == OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      // NOTE: This is ugly and too hardcoded. There should exist better ways of doing it.
      //        The culprit is that the generics for the external model reference is bad.
      //        There needs to be a way of *knowing* what the reference contains, and getUnwrappedType to handle it.
      const unwrapped = OmniUtil.getUnwrappedType(pointer);
      const unwrappedInheritable = OmniUtil.asInheritableType(unwrapped);
      if (!unwrappedInheritable) {
        throw new Error(`Something is wrong with the external model reference. It is not inheritable`);
      }

      return JavaDependencyGraph.checkTypeAndCallback(unwrappedInheritable, callback);

    } else {

      if (callback(pointer)) {
        return true;
      }
    }

    return false;
  }
}
