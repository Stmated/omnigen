import {AstNode, AstTransformer, AstTransformerArguments, OmniType, OmniTypeKind, RootAstNode, VisitResult} from '@omnigen/core';
import {OmniUtil, Visitor} from '@omnigen/core-util';
import {LoggerFactory} from '@omnigen/core-log';
import * as Code from '../Code';
import {CodeRootAstNode} from '../CodeRootAstNode.ts';
import {CodeAstUtils} from '../CodeAstUtils.ts';

const logger = LoggerFactory.create(import.meta.url);

type AstNodeComparator = (root: RootAstNode, a: AstNode, b: AstNode) => number | undefined;

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

  public compare(root: RootAstNode, a: AstNode, b: AstNode): number {

    for (const comparator of this._comparators) {
      const result = comparator.comparator(root, a, b);
      if (result !== undefined) {
        return result;
      }
    }

    return 0;
  }
}

SortVisitorRegistry.INSTANCE.register((root, a, b) => {

  const aWeight = getWeight(a, root);
  const bWeight = getWeight(b, root);

  let result = bWeight[0] - aWeight[0];
  if (result == 0) {
    result = aWeight[1].localeCompare(bWeight[1]);
  }

  return result;
});

const getWeight = (node: AstNode, root: RootAstNode): [number, string] => {

  let weight = 0;
  if (node instanceof Code.Field) {

    if (node.property) {
      const pattern = OmniUtil.getPropertyNamePattern(node.property.name);
      if (pattern) {

        weight += 0;
        weight += getModifierWeight(node.modifiers);
        return [weight, pattern];
      }
    }

    weight += 300;
    weight += getModifierWeight(node.modifiers);
    return [weight, node.identifier.value];
  } else if (node instanceof Code.EnumItemList) {
    weight += 400;
    return [weight, 'enum-list'];
  } else if (node instanceof Code.ConstructorDeclaration) {
    weight += 200;
    return [weight, 'constructor'];
  } else if (node instanceof Code.MethodDeclaration) {
    weight += 100;
    weight -= getModifierWeight(node.signature.modifiers);
    if (node.signature.identifier instanceof Code.GetterIdentifier || node.signature.identifier instanceof Code.SetterIdentifier) {
      return [weight, node.signature.identifier.identifier.value];
    } else {
      return [weight, node.signature.identifier.value];
    }
  } else if (node instanceof Code.AbstractObjectDeclaration) {
    weight += 0;
    weight += getModifierWeight(node.modifiers);
    return [weight, node.name.value];
  } else if (node instanceof Code.FieldBackedGetter) {
    weight += 0;

    const field = root.resolveNodeRef(node.fieldRef);
    const res = getWeight(field, root);
    return [weight + res[0], node.getterName?.value ?? res[1]];

  } else if (node instanceof Code.FieldBackedSetter) {
    weight += 0;

    const field = root.resolveNodeRef(node.fieldRef);
    const res = getWeight(field, root);
    return [weight + res[0], node.identifier?.value ?? res[1]];
  }

  if ('name' in node && node.name instanceof Code.Identifier) {

    weight += 0;
    return [weight, node.name.value];
  } else if (node instanceof Code.Identifier) {
    weight += 0;
    return [weight, node.value];
  }

  // NOTE: Not good. Better would be to give a visitor which finds first identifier, even if it is hidden deep and weird.
  //        But right now I do not know how to nicely solve this.
  let n: object = node;
  while ('identifier' in n) {
    if (n.identifier instanceof Code.Identifier) {
      weight += 0;
      return [weight, n.identifier.value];
    } else if (n.identifier && typeof n.identifier === 'object') {
      n = n.identifier;
    } else {
      break;
    }
  }

  return [0, ''];
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

      visitObjectDeclaration: (n, v) => {
        return [
          n.comments?.visit(v),
          n.annotations?.visit(v),
          n.modifiers.visit(v),
          n.name.visit(v),
          n.genericParameterList?.visit(v),
          n.extends?.visit(v),
          n.implements?.visit(v),
          v.visitObjectDeclarationBody(n, v),
        ];
      },

      visitEdgeType: (n, v) => {
        defaultVisitor.visitEdgeType(n, v);

        if (ownerStack.length > 0) {

          const objDecNode = ownerStack[ownerStack.length - 1];
          // const objDecNodeType = CodeAstUtils.getOmniType(args.root, objDecNode);
          // const objDecBaseType = this.getBaseOmniType(objDecNodeType);
          const baseType = this.getBaseOmniType(n.omniType);

          if (baseType) {

            const baseTypes: OmniType[] = OmniUtil.getFlattenedTypes(baseType);
            if (baseTypes[0] !== baseType) {
              baseTypes.splice(0, 0, baseType);
            }

            const map = (nodeToTypes.has(objDecNode) ? nodeToTypes : nodeToTypes.set(objDecNode, [])).get(objDecNode)!;
            for (const type of baseTypes) {
              map.push(type);
            }
          }
        }
      },
    }));

    const sort = (children: AstNode[], args: AstTransformerArguments<CodeRootAstNode>, withDependencies: boolean) => {
      const comparator = SortVisitorRegistry.INSTANCE;

      // First sort it by type/name/whatever.
      children.sort((a, b) => comparator.compare(args.root, a, b));

      if (withDependencies) {

        // Then sort it by dependencies, so that Declarations are before any Use (as best we can)
        this.customSort(children, (a, b) => {

          const bDependencies = nodeToTypes.get(b);
          if (bDependencies) {
            const aType = this.getBaseOmniType(CodeAstUtils.getOmniType(args.root, a));
            if (aType) {
              const flattened = OmniUtil.getFlattenedTypes(aType);
              if (bDependencies.some(value => flattened.includes(value))) {
                return -1;
              }
            }
          }

          const aDependencies = nodeToTypes.get(a);
          if (aDependencies) {
            const bType = this.getBaseOmniType(CodeAstUtils.getOmniType(args.root, b));
            if (bType) {
              const flattened = OmniUtil.getFlattenedTypes(bType);
              if (aDependencies.some(value => flattened.includes(value))) {
                return 1;
              }
            }
          }

          return 0;
        });
      }
    };

    args.root.visit(Visitor.create(defaultVisitor, {

      visitObjectDeclaration: (n, v) => {

        // Go deeper, in case there nested types
        defaultVisitor.visitObjectDeclaration(n, v);

        const children = n.body.children;
        sort(children, args, false);
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

        // Go deeper, in case there nested types
        defaultVisitor.visitCompilationUnit(n, v);

        const children = n.children;
        sort(children, args, true);
      },

      visitField: () => {
      },
      visitMethodDeclaration: () => {
      },
      visitConstructor: () => {
      },
    }));
  }

  private getBaseOmniType(type: OmniType | undefined): OmniType | undefined {

    if (!type) {
      return undefined;
    }

    if (type.kind === OmniTypeKind.GENERIC_SOURCE) {
      return this.getBaseOmniType(type.of);
    }

    if (type.kind === OmniTypeKind.GENERIC_TARGET) {
      return this.getBaseOmniType(type.source);
    }

    if (type.kind === OmniTypeKind.DECORATING) {
      return this.getBaseOmniType(type.of);
    }

    if (type.kind === OmniTypeKind.INTERFACE) {
      return this.getBaseOmniType(type.of);
    }

    if (type.kind === OmniTypeKind.EXTERNAL_MODEL_REFERENCE) {
      return this.getBaseOmniType(type.of);
    }

    return type;
  }

  private customSort<T>(arr: Array<T>, compareFn: (a: T, b: T) => number) {

    const n = arr.length;

    for (let i = 0; i < n; i++) {
      let minIndex = i;
      for (let j = i + 1; j < n; j++) {
        if (compareFn(arr[j], arr[minIndex]) < 0) {
          minIndex = j;
        }
      }

      if (minIndex !== i) {
        [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
      }
    }

    return arr;
  }
}
