import {GenericClassType, GenericType, GenericTypeKind} from '@parse/GenericModel';

/**
 * Used for building a dependency graph from a list of existing types.
 * It will investigate types and their inherited from types, and decide things like:
 * - How many types depend on a certain type?
 * - Which types should be implementations, and which should be interfaces?
 * - Which types can have their properties described using generics? (work in progress)
 */
export class DependencyGraphBuilder {

  /**
   * A type can end up as multiple things, and it is up to the target language to translate it.
   * For example, a type can be both Abstract and an Interface.
   * In for example Java, it should output type as two files: Abstract[XYZ] and I[XYZ], then replace use with both.
   *
   * @param namedTypes The types that are named. All other types are inline/anonymous
   */
  public static build(namedTypes: GenericType[], options = DEFAULT_GRAPH_OPTIONS): DependencyGraph {

    const graph: DependencyGraph = {
      // usedBy: new Map<GenericType, GenericType[]>(),
      uses: new Map<GenericType, GenericType[]>(),
      // abstracts: [], // TODO: Always empty for now. Need to implement later
      concretes: [],
      interfaces: []
    };

    for (const type of namedTypes) {
      if (type.kind == GenericTypeKind.OBJECT) {
        graph.concretes.push(type);

        if (type.extendedBy) {
          for (const expanded of DependencyGraphBuilder.expand(type.extendedBy)) {
            this.addUseToGraph(graph, type, expanded);
          }
        }
      } else if (type.kind == GenericTypeKind.COMPOSITION) {
        graph.concretes.push(type);
        for (const expanded of DependencyGraphBuilder.expand(type)) {
          this.addUseToGraph(graph, type, expanded);
        }
      }
    }

    // We should help and clean up some dependencies.
    // If he have A->B, B->C, then D->B&D->C should becomes only D->C
    for (const uses of graph.uses.entries()) {

      const ancestors = uses[1].map(it => [it].concat(DependencyGraphBuilder.getAncestors(graph, it)));
      for (let i = 0; i < ancestors.length; i++) {
        for (let n = i + 1; n < ancestors.length; n++) {

          const found: GenericType[] = [];
          for (let a = 0; a < ancestors[i].length; a++) {
            for (let b = 0; b < ancestors[n].length; b++) {
              if (ancestors[i][a] == ancestors[n][b]) {
                found.push(ancestors[n][b]);
                break;
              }
            }
          }

          if (found.length > 0) {

            // Ancestor B is already included through A, so will remove B.
            graph.uses.set(uses[0], uses[1].filter(it => !found.includes(it)));
            break;
          }
        }
      }
    }

    if (!options.multipleInheritance) {
      for (const e of graph.uses.entries()) {

        for (let i = 1; i < e[1].length; i++) {

          // And 2nd+ inheritance must be done as an interface.
          const interfaceType = e[1][i];
          if (namedTypes.includes(interfaceType) && !graph.interfaces.includes(interfaceType)) {
            graph.interfaces.push(interfaceType);
          }
        }
      }
    }

    return graph;
  }

  private static getCommonAncestors(graph: DependencyGraph, a: GenericType, b: GenericType): GenericType[] {

    const aAncestors = DependencyGraphBuilder.getAncestors(graph, a);
    const bAncestors = DependencyGraphBuilder.getAncestors(graph, b);

    return this.getCommon(aAncestors, bAncestors);
  }

  private static getCommon(a: GenericType[], b: GenericType[]): GenericType[] {
    return a.filter(value => b.includes(value));
  }

  private static getAncestors(graph: DependencyGraph, type: GenericType): GenericType[] {

    const ancestors = graph.uses.get(type);
    if (ancestors) {
      return ancestors.concat(ancestors.flatMap(it => DependencyGraphBuilder.getAncestors(graph, it)));
    } else {
      return [];
    }
  }

  private static addUseToGraph(graph: DependencyGraph, usedBy: GenericType, uses: GenericType): void {
    if (!graph.uses.get(usedBy)) {
      graph.uses.set(usedBy, []);
    }

    const existingUses = (graph.uses.get(usedBy) || []);
    graph.uses.set(usedBy, existingUses.concat(uses));
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

  // usedBy: Map<GenericType, GenericType[]>;
  uses: Map<GenericType, GenericType[]>;
  concretes: GenericType[];
  interfaces: GenericType[];
  // abstracts: GenericType[];
}
