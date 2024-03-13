import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {
  OmniUtil,
  VisitorFactoryManager,
} from '@omnigen/core-util';
import * as Java from '../ast';
import {Identifier} from '../ast';
import {JavaUtil} from '../util';

/**
 * TODO: Should this add the method declarations for interfaces as well?
 */
export class AddAbstractAccessorsAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

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
              new Java.RegularType(type),
            ),
          );

          node.body.children.push(literalMethod);
        }
      },
    }));
  }
}
