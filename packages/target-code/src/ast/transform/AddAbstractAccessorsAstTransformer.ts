import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
import {AstTransformer, AstTransformerArguments, TargetOptions} from '@omnigen/core';
import {CodeRootAstNode} from '../CodeRootAstNode';
import * as Code from '../../ast/CodeAst';
import {CodeOptions} from '../../options/CodeOptions';

/**
 * TODO: Should this add the method declarations for interfaces as well?
 */
export class AddAbstractAccessorsAstTransformer implements AstTransformer<CodeRootAstNode, TargetOptions & CodeOptions> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode, TargetOptions & CodeOptions>): void {

    args.root.visit(VisitorFactoryManager.create(args.root.createVisitor(), {

      visitEnumDeclaration: () => {},
      visitInterfaceDeclaration: () => {},
      visitMethodDeclaration: () => {},

      visitClassDeclaration: node => {

        for (const property of OmniUtil.getPropertiesOf(node.type.omniType)) {
          if (!property.abstract) {
            continue;
          }

          const name = OmniUtil.getPropertyAccessorName(property.name);
          if (!name) {
            continue;
          }

          const type = property.type;

          const literalMethod = new Code.AbstractMethodDeclaration(
            new Code.MethodDeclarationSignature(
              new Code.GetterIdentifier(new Code.Identifier(name), args.root.getAstUtils().createTypeNode(property.type)),
              new Code.EdgeType(type),
              undefined,
              new Code.ModifierList(new Code.Modifier(Code.ModifierType.PUBLIC), new Code.Modifier(Code.ModifierType.ABSTRACT)),
            ),
          );

          node.body.children.push(new Code.Statement(literalMethod));

          if (!node.modifiers.children.some(it => it.type === Code.ModifierType.ABSTRACT)) {

            // If we add an abstract method to a class, then we must make the class abstract as well.
            node.modifiers.children.push(new Code.Modifier(Code.ModifierType.ABSTRACT));
          }
        }
      },
    }));
  }
}
