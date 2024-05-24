import {AstNode, AstTransformer, AstTransformerArguments, RootAstNode} from '@omnigen/core';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
import {LoggerFactory} from '@omnigen/core-log';
import * as Code from '../CodeAst';
import {CodeRootAstNode} from '../CodeRootAstNode.ts';

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
    weight += 300;
    weight += getModifierWeight(node.modifiers);
    return [weight, node.identifier.value];
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
    if (node.getterName) {
      return [weight, node.getterName.identifier.value];
    } else {

      const field = root.resolveNodeRef(node.fieldRef);
      return getWeight(field, root);
    }
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
  if (modifiers.children.find(it => it.type == Code.ModifierType.STATIC)) {
    weight += 10;
  }

  if (modifiers.children.find(it => it.type == Code.ModifierType.FINAL)) {
    weight += 5;
  }

  if (modifiers.children.find(it => it.type == Code.ModifierType.PRIVATE)) {
    weight += 3;
  }

  if (modifiers.children.find(it => it.type == Code.ModifierType.PROTECTED)) {
    weight += 1;
  }

  return weight;
};

export class ReorderMembersAstTransformer implements AstTransformer<CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode>): void {

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitObjectDeclaration: (node, visitor) => {

        if (!(node instanceof Code.EnumDeclaration)) {

          // Do not re-order an enum, it is sensitive to order.
          const comparator = SortVisitorRegistry.INSTANCE;
          node.body.children.sort((a, b) => {
            return comparator.compare(args.root, a, b);
          });
        }

        // Go deeper, in case there are nested types
        defaultVisitor.visitObjectDeclaration(node, visitor);
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

      visitCompilationUnit: (node, visitor) => {

        const comparator = SortVisitorRegistry.INSTANCE;
        node.children.sort((a, b) => {
          return comparator.compare(args.root, a, b);
        });

        // Go deeper, in case there nested types
        defaultVisitor.visitCompilationUnit(node, visitor);
      },

      visitField: () => {
      },
      visitMethodDeclaration: () => {
      },
      visitConstructor: () => {
      },
    }));
  }
}
