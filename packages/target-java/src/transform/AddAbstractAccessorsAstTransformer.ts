import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.js';
import {
  OmniUtil,
  VisitorFactoryManager,
} from '@omnigen/core';
import * as Java from '../ast/index.js';
import {Identifier} from '../ast/index.js';
import {JavaUtil} from '../util/index.js';

export class AddAbstractAccessorsAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): Promise<void> {

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

    return Promise.resolve();
  }
}
