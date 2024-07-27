import {OmniUtil, Visitor} from '@omnigen/core-util';
import {AstTransformer, AstTransformerArguments, TargetOptions} from '@omnigen/core';
import {CodeRootAstNode} from '../CodeRootAstNode';
import * as Code from '../../ast/CodeAst';
import {CodeOptions} from '../../options/CodeOptions';

export class AddAbstractAccessorsAstTransformer implements AstTransformer<CodeRootAstNode, TargetOptions & CodeOptions> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode, TargetOptions & CodeOptions>): void {

    args.root.visit(Visitor.create(args.root.createVisitor(), {

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

          // TODO: Field -> property -- check if has one, then abort. Something is weird.

          const literalMethod = new Code.MethodDeclaration(
            new Code.MethodDeclarationSignature(
              new Code.GetterIdentifier(new Code.Identifier(name), property.type),
              new Code.EdgeType(type),
              undefined,
              new Code.ModifierList(new Code.Modifier(Code.ModifierKind.PUBLIC), new Code.Modifier(Code.ModifierKind.ABSTRACT)),
            ),
          );

          node.body.children.push(literalMethod);

          if (!node.modifiers.children.some(it => it.kind === Code.ModifierKind.ABSTRACT)) {

            // If we add an abstract method to a class, then we must make the class abstract as well.
            node.modifiers.children.push(new Code.Modifier(Code.ModifierKind.ABSTRACT));
          }
        }
      },
    }));
  }
}
