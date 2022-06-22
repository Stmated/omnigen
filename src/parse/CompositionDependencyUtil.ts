/**
 * Used for building a dependency graph from a list of existing types.
 * It will investigate types and their inherited from types, and decide things like:
 * - How many types depend on a certain type?
 * - Which types should be implementations, and which should be interfaces?
 * - Which types can have their properties described using generics? (work in progress)
 */
import {GenericType, GenericTypeKind} from '@parse/GenericModel';

export class CompositionDependencyUtil {

  /**
   * Builds an informational dependency graph between the different types.
   *
   * It is up to the caller to make sure that only the exported/public/fronting types are sent along.
   * It is up to this graph builder to investigate the class extensions and decide what to do with them.
   *
   * A type can end up as multiple things, and it is up to the target language to translate it.
   * For example, a type can be both Abstract and an Interface.
   * In for example Java, it should output type as two files: Abstract[XYZ] and I[XYZ], then replace use with both.
   */
  public static buildGraph(types: GenericType[], options = DEFAULT_GRAPH_OPTIONS): DependencyGraph {

    const graph: DependencyGraph = {
      usedBy: new Map<GenericType, GenericType[]>(),
      uses: new Map<GenericType, GenericType[]>(),
      abstracts: [],
      concretes: [],
      interfaces: []
    };

    const orderMap = new Map<GenericType, Set<number>>();
    for (const type of types) {
      if (type.kind == GenericTypeKind.OBJECT) {
        graph.concretes.push(type);

        if (type.extendedBy) {
          let index = 0;
          for (const expanded of CompositionDependencyUtil.expand(type.extendedBy)) {
            if (!graph.usedBy.get(expanded)) {
              graph.usedBy.set(expanded, []);
            }
            if (!graph.uses.get(type)) {
              graph.uses.set(type, []);
            }
            graph.usedBy.set(expanded, (graph.usedBy.get(expanded) || []).concat(type));
            graph.uses.set(type, (graph.uses.get(type) || []).concat(expanded));

            let set = orderMap.get(expanded);
            if (!set) {
              set = new Set<number>();
              orderMap.set(expanded, set);
            }
            set.add(index);
            index++;
          }
        }
      }
    }

    for (const from of graph.usedBy.keys()) {
      if (!types.includes(from)) {

        // The type that have mapping From->To, is not included in base types.
        // This means it is not used anywhere except as inheritance for other types.
        // It can therefore be handled as abstract.
        const orders: number[] = [];
        const set = orderMap.get(from);
        if (set) {
          orders.push(...set);
        }
        orders.sort();

        if (orders.length == 0 || orders[0] == 0) {
          graph.abstracts.push(from);
        }
        if (orders.length > 0 && orders[orders.length - 1] > 0) {
          graph.interfaces.push(from);
        }
      }
    }

    return graph;
  }

  private static expand(type: GenericType): GenericType[] {

    if (type.kind == GenericTypeKind.COMPOSITION) {
      return type.types;
    } else {
      return [type];
    }
  }
}

export interface DependencyGraphOptions {
  multipleInheritance: boolean;
}

export const DEFAULT_GRAPH_OPTIONS: DependencyGraphOptions = {
  multipleInheritance: false
}

export interface DependencyGraph {

  usedBy: Map<GenericType, GenericType[]>;
  uses: Map<GenericType, GenericType[]>;
  concretes: GenericType[];
  abstracts: GenericType[];
  interfaces: GenericType[];
}
