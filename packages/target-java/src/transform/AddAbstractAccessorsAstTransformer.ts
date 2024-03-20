import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
import * as Java from '../ast';
import {Identifier, ModifierType} from '../ast';
import {JavaUtil} from '../util';

/**
 * TODO: Should this add the method declarations for interfaces as well?
 */
export class AddAbstractAccessorsAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    args.root.visit(VisitorFactoryManager.create(args.root.createVisitor(), {

      visitEnumDeclaration: () => {},
      visitInterfaceDeclaration: () => {},
      visitMethodDeclaration: () => {},

      visitClassDeclaration: node => {

        for (const property of OmniUtil.getPropertiesOf(node.type.omniType)) {
          if (!property.abstract) {
            continue;
          }

          const name = property.propertyName ?? property.fieldName ?? property.name;
          const type = property.type;

          const literalMethod = new Java.AbstractMethodDeclaration(
            new Java.MethodDeclarationSignature(
              new Identifier(JavaUtil.getGetterName(name, type)),
              new Java.EdgeType(type),
              undefined,
              new Java.ModifierList(new Java.Modifier(ModifierType.PUBLIC), new Java.Modifier(ModifierType.ABSTRACT)),
            ),
          );

          node.body.children.push(literalMethod);

          if (!node.modifiers.children.some(it => it.type == ModifierType.ABSTRACT)) {

            // If we add an abstract method to a class, then we must make the class abstract as well.
            node.modifiers.children.push(new Java.Modifier(ModifierType.ABSTRACT));
          }
        }
      },
    }));
  }
}
