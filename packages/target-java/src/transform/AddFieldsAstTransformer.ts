import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {OmniType, OmniTypeKind} from '@omnigen/core';
import * as Java from '../ast/index.ts';
import {JavaUtil} from '../util/index.ts';
import {JavaAstUtils} from './JavaAstUtils.ts';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';

export class AddFieldsAstTransformer extends AbstractJavaAstTransformer {
  transformAst(args: JavaAstTransformerArgs): void {

    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitClassDeclaration: (node, visitor) => {

        // Let's add all the fields that belong to this object.
        // It is up to other transformers to later add getters/setters or lombok (Java) or whatever language-specific.

        const type = node.type.omniType;
        const body = node.body;

        if (type.kind == OmniTypeKind.OBJECT) {

          for (const property of OmniUtil.getPropertiesOf(type)) {
            JavaAstUtils.addOmniPropertyToBlockAsField(body, property, args.options);
          }

          if (type.additionalProperties && !JavaUtil.superMatches(args.model, type, parent => this.hasAdditionalProperties(parent))) {

            // No parent implements additional properties, so we should.
            body.children.push(new Java.AdditionalPropertiesDeclaration());
          }
        }

        for (const property of JavaUtil.collectUnimplementedPropertiesFromInterfaces(type)) {
          JavaAstUtils.addOmniPropertyToBlockAsField(body, property, args.options);
        }

        // Then keep searching deeper, into nested types
        AbstractJavaAstTransformer.JAVA_VISITOR.visitClassDeclaration(node, visitor);
      },
    }));
  }

  private hasAdditionalProperties(parent: OmniType): boolean {
    return parent.kind == OmniTypeKind.OBJECT && parent.additionalProperties == true;
  }
}
