import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {OmniTypeKind} from '@omnigen/core';
import {JavaUtil} from '../util';
import {JavaAstUtils} from './JavaAstUtils.ts';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';

export class AddFieldsAstTransformer extends AbstractJavaAstTransformer {
  transformAst(args: JavaAstTransformerArgs): void {

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitClassDeclaration: (node, visitor) => {

        // Let's add all the fields that belong to this object.
        // It is up to other transformers to later add getters/setters or lombok (Java) or whatever language-specific.

        const type = node.type.omniType;
        const body = node.body;

        if (type.kind == OmniTypeKind.OBJECT) {

          const properties = OmniUtil.getPropertiesOf(type);
          for (const property of properties) {
            JavaAstUtils.addOmniPropertyToBlockAsField(property, body, args.options);
          }

          // if (type.additionalProperties && !JavaUtil.superMatches(args.model, type, parent => this.hasAdditionalProperties(parent))) {
          //
          //   // No parent implements additional properties, so we should.
          //   body.children.push(new AdditionalPropertiesDeclaration(args.options));
          // }
        }

        for (const property of JavaUtil.collectUnimplementedPropertiesFromInterfaces(type)) {
          JavaAstUtils.addOmniPropertyToBlockAsField(property, body, args.options);
        }

        // Then keep searching deeper, into nested types
        defaultVisitor.visitClassDeclaration(node, visitor);
      },
    }));
  }

  // private hasAdditionalProperties(parent: OmniType): boolean {
  //   return parent.kind == OmniTypeKind.OBJECT && parent.additionalProperties == true;
  // }
}
