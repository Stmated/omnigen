import {AstNode, AstTransformer, AstTransformerArguments, OmniType, RootAstNode, TargetOptions} from '@omnigen/api';
import {OmniUtil, ReferenceNodeNotFoundError, Visitor} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';
import * as Code from '../Code';
import {CodeRootAstNode} from '../CodeRootAstNode.ts';
import {CodeAstUtils} from '../CodeAstUtils.ts';

const logger = LoggerFactory.create(import.meta.url);

export enum ExecutionStatus {
  NEXT = 'next',
  ABORT = 'abort',
}

export type AstNodeComparatorOptions = TargetOptions;
export type AstNodeComparator = (root: RootAstNode, a: AstNode, b: AstNode, options: AstNodeComparatorOptions) => number | ExecutionStatus;

type ImportantAstNodeComparator = {
  importance: number;
  comparator: AstNodeComparator;
};

export class SortVisitorRegistry {

  public static readonly INSTANCE = new SortVisitorRegistry();

  private readonly _comparators: ImportantAstNodeComparator[] = [];

  public register(comparator: AstNodeComparator, importance = 0): void {

    const weighted = {
      importance,
      comparator,
    };

    this._comparators.push(weighted);
    this._comparators.sort((a, b) => b.importance - a.importance);
  }

  public compare(root: RootAstNode, a: AstNode, b: AstNode, options: AstNodeComparatorOptions): number {

    for (const comparator of this._comparators) {
      const result = comparator.comparator(root, a, b, options);
      if (typeof result === 'number') {
        return result;
      }

      if (result === ExecutionStatus.ABORT) {
        break;
      }
    }

    return 0;
  }
}

SortVisitorRegistry.INSTANCE.register((root, a, b, options) => {

  try {
    const aWeight = getWeight(a, root, options);
    const bWeight = getWeight(b, root, options);

    let result = bWeight[0] - aWeight[0];
    if (result == 0 && (aWeight[1] || bWeight[1])) {
      result = (aWeight[1] ?? '').localeCompare(bWeight[1] ?? '');
    }

    return result;
  } catch (ex) {
    if (ex instanceof ReferenceNodeNotFoundError) {
      return 0;
    } else {
      throw ex;
    }
  }
});

const getWeight = (node: AstNode, root: RootAstNode, options: TargetOptions): [number, string | undefined] => {

  if (node instanceof Code.Field) {

    let weight = 300;
    let name: string | undefined;

    weight += getModifierWeight(node.modifiers);
    if (options.orderMembersByName) {
      name = node.identifier.value;
    }

    if (node.property) {
      const pattern = OmniUtil.getPropertyNamePattern(node.property.name);
      if (pattern) {
        weight--;
        name = pattern;
      }
    }

    return [weight, name];
  } else if (node instanceof Code.EnumItemList) {
    return [400, undefined];
  } else if (node instanceof Code.ConstructorDeclaration) {
    return [200, undefined];
  } else if (node instanceof Code.MethodDeclaration) {
    const weight = 100 - getModifierWeight(node.signature.modifiers);
    if (node.signature.identifier instanceof Code.GetterIdentifier || node.signature.identifier instanceof Code.SetterIdentifier) {
      return [weight, options.orderMembersByName ? node.signature.identifier.identifier.value : undefined];
    } else {
      return [weight, options.orderMembersByName ? node.signature.identifier.value : undefined];
    }
  } else if (node instanceof Code.AbstractObjectDeclaration) {

    const weight = getModifierWeight(node.modifiers);
    return [weight, options.orderObjectsByName ? node.name.value : undefined];
  } else if (node instanceof Code.FieldBackedGetter) {

    const field = root.resolveNodeRef(node.fieldRef);
    const res = getWeight(field, root, options);
    const name = options.orderMembersByName ? (node.getterName?.value ?? res[1]) : undefined;
    return [res[0], name];
  } else if (node instanceof Code.FieldBackedSetter) {
    const field = root.resolveNodeRef(node.fieldRef);
    const res = getWeight(field, root, options);
    const name = options.orderMembersByName ? (node.identifier?.value ?? res[1]) : undefined;
    return [res[0], name];
  }

  if (options.orderMembersByName) {

    if ('name' in node && node.name instanceof Code.Identifier) {
      return [0, node.name.value];
    } else if (node instanceof Code.Identifier) {
      return [0, node.value];
    }

    // NOTE: Not good. Better would be to give a visitor which finds first identifier, even if it is hidden deep and weird.
    //        But right now I do not know how to nicely solve this.
    let n: object = node;
    while ('identifier' in n) {
      if (n.identifier instanceof Code.Identifier) {
        return [0, n.identifier.value];
      } else if (n.identifier && typeof n.identifier === 'object') {
        n = n.identifier;
      } else {
        break;
      }
    }
  }

  return [0, undefined];
};

const getModifierWeight = (modifiers: Code.ModifierList) => {

  let weight = 0;
  if (modifiers.children.find(it => it.kind == Code.ModifierKind.STATIC)) {
    weight += 10;
  }

  if (modifiers.children.find(it => it.kind == Code.ModifierKind.FINAL)) {
    weight += 5;
  }

  if (modifiers.children.find(it => it.kind == Code.ModifierKind.PRIVATE)) {
    weight += 3;
  }

  if (modifiers.children.find(it => it.kind == Code.ModifierKind.PROTECTED)) {
    weight += 1;
  }

  return weight;
};

// TODO: Order members by "dependence" -- so if a declaration uses another type, then that type should be ordered earlier!
//       Should just need to visit for all edge types and build a graph from it!

export class ReorderMembersAstTransformer implements AstTransformer<CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode>): void {

    if (!args.options.orderMembersByName && !args.options.orderObjectsByName && !args.options.orderObjectsByDependency) {
      return;
    }

    const defaultVisitor = args.root.createVisitor();
    const ownerStack: AstNode[] = [];

    const nodeToTypes = new Map<AstNode, OmniType[]>();

    args.root.visit(Visitor.create(defaultVisitor, {

      visitCompilationUnit: (n, v) => {

        for (const child of n.children) {
          try {
            // Go deeper, in case there are nested types
            ownerStack.push(child);
            child.visit(v);
          } finally {
            ownerStack.pop();
          }
        }
      },

      visitNamespaceBlock: (n, v) => {
        try {
          ownerStack.push(n);
          defaultVisitor.visitNamespaceBlock(n, v);
        } finally {
          ownerStack.pop();
        }
      },

      visitObjectDeclaration: (n, v) => {
        try { // Override visit to skip its own type node.
          ownerStack.push(n);
          n.comments?.visit(v);
          n.annotations?.visit(v);
          n.modifiers.visit(v);
          n.name.visit(v);
          n.genericParameterList?.visit(v);
          n.extends?.visit(v);
          n.implements?.visit(v);
          v.visitObjectDeclarationBody(n, v);
        } finally {
          ownerStack.pop();
        }
      },

      visitEdgeType: (n, v) => {
        defaultVisitor.visitEdgeType(n, v);
        if (ownerStack.length <= 0) {
          return;
        }

        const baseType = OmniUtil.getTopLevelType(n.omniType);
        if (baseType) {

          const baseTypes: OmniType[] = OmniUtil.getFlattenedTypes(baseType);
          if (baseTypes[0] !== baseType) {
            baseTypes.splice(0, 0, baseType);
          }

          // We add this edge type to all possible owners in the stack.
          // This way when we later try to look up `which types does this type use` then we have multiple levels of granularity.
          for (const owner of ownerStack) {
            const map = (nodeToTypes.has(owner) ? nodeToTypes : nodeToTypes.set(owner, [])).get(owner)!;
            for (const type of baseTypes) {
              map.push(type);
            }
          }
        }
      },
    }));

    const sort = (children: AstNode[], args: AstTransformerArguments<CodeRootAstNode>, forObjects: boolean) => {
      const comparator = SortVisitorRegistry.INSTANCE;

      if (children.length <= 1) {
        return;
      }

      if (forObjects && args.options.orderObjectsByDependency) {

        // Then sort it by dependencies, so that Declarations are before any Use (as best we can)
        ReorderMembersAstTransformer.topologicalSort(
          children,
          (a, b) => ReorderMembersAstTransformer.getSortValue(args.root, a, b, nodeToTypes),
          (a, b) => comparator.compare(args.root, a, b, args.options),
        );
      } else {
        children.sort((a, b) => comparator.compare(args.root, a, b, args.options));
      }
    };

    args.root.visit(Visitor.create(defaultVisitor, {

      visitObjectDeclaration: (n, v) => {

        // Go deeper, in case there nested types
        defaultVisitor.visitObjectDeclaration(n, v);
        sort(n.body.children, args, false);
      },

      visitAnnotationList: n => {

        // NOTE: Is this the expected order? Sorting by the full import name?
        n.children.sort((a, b) => {
          if (a instanceof Code.Annotation && b instanceof Code.Annotation) {
            const aName = a.type.getImportName() || a.type.getLocalName() || OmniUtil.describe(a.type.omniType);
            const bName = b.type.getImportName() || b.type.getLocalName() || OmniUtil.describe(b.type.omniType);

            return aName.localeCompare(bName);
          }

          return 0;
        });
      },

      visitCompilationUnit: (n, v) => {

        // Go deeper, in case there are nested types
        defaultVisitor.visitCompilationUnit(n, v);
        sort(n.children, args, true);
      },

      visitNamespaceBlock: (n, v) => {

        // Go deeper, in case there are nested types
        defaultVisitor.visitNamespaceBlock(n, v);
        sort(n.block.children, args, true);
      },

      visitField: () => {
      },
      visitMethodDeclaration: () => {
      },
      visitConstructor: () => {
      },
    }));
  }

  public static getSortValue(
    root: Code.CodeRootAstNode,
    a: Code.AstNode,
    b: Code.AstNode,
    nodeToTypes: Map<Code.AstNode, Array<OmniType>>,
  ): -1 | 0 {

    const bDependencies = nodeToTypes.get(b);
    if (bDependencies) {
      const aType = CodeAstUtils.getOmniType(root, a);
      if (aType) {
        const aTopType = OmniUtil.getTopLevelType(aType);
        if (bDependencies.includes(aTopType)) {
          return -1;
        }
      }
    }

    return 0;
  }

  public static topologicalSort<T>(
    items: T[],
    dependencyCompare: (a: T, b: T) => number,
    defaultCompare: (a: T, b: T) => number,
  ): void {

    const graph: Map<T, T[]> = new Map();

    items.sort(defaultCompare);

    // Initialize the graph
    for (const item of items) {
      graph.set(item, []);
    }

    // Build the graph
    for (let i = 0; i < items.length; i++) {
      for (let j = 0; j < items.length; j++) {
        if (i !== j) {
          if (dependencyCompare(items[i], items[j]) === -1) {
            graph.get(items[i])!.push(items[j]);
          }
        }
      }
    }

    const visited: Set<T> = new Set();
    const result: T[] = [];
    const temp: Set<T> = new Set();

    const visit = (item: T) => {
      if (temp.has(item)) {
        logger.trace(`Cycle detected in graph, will not dive deeper`);
      } else if (!visited.has(item)) {
        temp.add(item);
        for (const neighbor of graph.get(item)!) {
          visit(neighbor);
        }
        temp.delete(item);
        visited.add(item);
        result.push(item);
      }
    };

    // Perform the topological sort
    for (const item of items) {
      if (!visited.has(item)) {
        visit(item);
      }
    }

    // Reverse the result to reflect correct topological order
    result.reverse();

    for (let i = 0; i < result.length; i++) {
      items[i] = result[i];
    }
  }
}
