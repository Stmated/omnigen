import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.js';
import {AstNode} from '@omnigen/core';
import * as Java from '../ast';
import {ModifierType} from '../ast';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';

export class ReorderMembersTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitObjectDeclaration: (node, visitor) => {

        if (node instanceof Java.EnumDeclaration) {

          // Do not re-order an enum, it is sensitive to order.
          return;
        }

        if (node.annotations) {

          // NOTE: Is this the expected order? Sorting by the full import name?
          node.annotations.children.sort((a, b) => {
            const aName = a.type.getImportName() || a.type.getLocalName() || OmniUtil.describe(a.type.omniType);
            const bName = b.type.getImportName() || b.type.getLocalName() || OmniUtil.describe(b.type.omniType);

            return aName.localeCompare(bName);
          });
        }

        node.body.children.sort((a, b) => {

          const aWeight = this.getWeight(a);
          const bWeight = this.getWeight(b);

          let result = bWeight[0] - aWeight[0];
          if (result == 0) {
            result = aWeight[1].localeCompare(bWeight[1]);
          }

          return result;
        });

        // Go deeper, in case there nested types
        defaultVisitor.visitObjectDeclaration(node, visitor);
      },

      visitCompilationUnit: (node, visitor) => {

        // NOTE: This is likely better off being sorted by dependency graph, so types are declared in proper order
        node.children.sort((a, b) => {

          const aWeight = this.getWeight(a);
          const bWeight = this.getWeight(b);

          let result = bWeight[0] - aWeight[0];
          if (result == 0) {
            result = aWeight[1].localeCompare(bWeight[1]);
          }

          return result;
        });

        // Go deeper, in case there nested types
        defaultVisitor.visitCompilationUnit(node, visitor);
      },

      visitField: () => {},
      visitMethodDeclaration: () => {},
      visitConstructor: () => {},
    }));
  }

  private getWeight(node: AstNode): [number, string] {

    let weight = 0;
    if (node instanceof Java.Field) {

      weight += 300;
      weight += this.getModifierWeight(node.modifiers);
      return [weight, node.identifier.value];
    }

    if (node instanceof Java.ConstructorDeclaration) {

      weight += 200;
      return [weight, 'constructor'];
    }

    if (node instanceof Java.MethodDeclaration) {

      weight += 100;
      weight -= this.getModifierWeight(node.signature.modifiers);
      return [weight, node.signature.identifier.value];
    }

    if (node instanceof Java.AbstractObjectDeclaration) {

      weight += 0;
      weight += this.getModifierWeight(node.modifiers);
      return [weight, node.name.value];
    }

    if ('name' in node && node.name instanceof Java.Identifier) {

      weight += 0;
      // weight += this.getModifierWeight(node.modifiers);
      return [weight, node.name.value];
    }

    return [0, ''];
  }

  private getModifierWeight(modifiers: Java.ModifierList) {

    let weight = 0;
    if (modifiers.children.find(it => it.type == ModifierType.STATIC)) {
      weight += 10;
    }

    if (modifiers.children.find(it => it.type == ModifierType.FINAL)) {
      weight += 5;
    }

    if (modifiers.children.find(it => it.type == ModifierType.PRIVATE)) {
      weight += 3;
    }

    if (modifiers.children.find(it => it.type == ModifierType.PROTECTED)) {
      weight += 1;
    }

    return weight;
  }
}
