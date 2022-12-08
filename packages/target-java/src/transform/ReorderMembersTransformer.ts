import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.js';
import {AbstractStNode, OmniUtil, VisitorFactoryManager} from '@omnigen/core';
import * as Java from '../ast/index.js';
import {ModifierType} from '../ast/index.js';


export class ReorderMembersTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): Promise<void> {


    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

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
        AbstractJavaAstTransformer.JAVA_VISITOR.visitObjectDeclaration(node, visitor);
      },

      visitField: () => {},
      visitMethodDeclaration: () => {},
      visitConstructor: () => {},
    }));

    return Promise.resolve();
  }

  private getWeight(node: AbstractStNode): [number, string] {

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

    // TODO: Should be removed. Should have been replaced with a CST
    if (node instanceof Java.FieldGetterSetter) {

      weight += 100;
      weight -= this.getModifierWeight(node.getter.signature.modifiers);
      return [weight, node.getter.field.identifier.value];
    }

    // TODO: Should be removed. Should have been replaced with a CST
    if (node instanceof Java.FieldBackedGetter) {

      weight += 100;
      weight -= this.getModifierWeight(node.signature.modifiers);
      return [weight, node.signature.identifier.value];
    }

    // TODO: Should be removed. Should have been replaced with a CST
    if (node instanceof Java.AdditionalPropertiesDeclaration) {

      weight += 100;
      weight -= this.getModifierWeight(node.adderMethod.signature.modifiers);
      return [weight, node.adderMethod.signature.identifier.value];
    }

    if (node instanceof Java.AbstractObjectDeclaration) {

      weight += 0;
      weight += this.getModifierWeight(node.modifiers);
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
