import {OmniClassType, OmniCompositionType, OmniType, OmniTypeKind} from '@parse';
import {DependencyGraph} from '@parse/DependencyGraphBuilder';

export class JavaDependencyGraph {

  // public static isAbstract(graph: DependencyGraph, type: GenericType): boolean {
  //   return graph.abstracts.includes(type);
  // }

  public static isInterface(graph: DependencyGraph, type: OmniType): boolean {
    return graph.interfaces.includes(type);
  }

  public static isClass(graph: DependencyGraph, type: OmniType): boolean {
    return !JavaDependencyGraph.isInterface(graph, type);
  }

  public static getExtends(graph: DependencyGraph, type: OmniClassType | OmniCompositionType): OmniClassType | undefined {

    const uses = graph.uses.get(type);
    if (uses) {
      for (const use of uses) {
        if (use.kind == OmniTypeKind.OBJECT && JavaDependencyGraph.isClass(graph, use)) {

          // It is not an interface. So either an abstract class or a concrete class. Either works.
          return use;
        }
      }
    }

    return undefined;
  }

  public static getImplements(graph: DependencyGraph, type: OmniClassType | OmniCompositionType): OmniType[] {

    const interfaces: OmniType[] = [];
    const uses = graph.uses.get(type);
    if (uses) {
      for (const use of uses) {
        if (JavaDependencyGraph.isInterface(graph, use)) {

          // It is an interface, so we push it onto the array.
          // TODO: This is actually INVALID -- this WILL become a CLASS WHEN RENDERED
          //        We need some kind of functionality that makes it possible to know *which* one we are referring to.
          interfaces.push(use);
        }
      }
    }

    return interfaces;
  }

  public static superMatches(graph: DependencyGraph, type: OmniClassType, callback: { (classType: OmniClassType): boolean}): boolean {

    let pointer: OmniClassType | undefined = type;
    while (pointer = JavaDependencyGraph.getExtends(graph, pointer)) {
      if (callback(pointer)) {
        return true;
      }
    }

    return false;
  }
}
