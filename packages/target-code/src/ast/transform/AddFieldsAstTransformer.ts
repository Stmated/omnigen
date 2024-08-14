import {AstTransformer, AstTransformerArguments, OmniTypeKind, TargetOptions} from '@omnigen/api';
import {OmniUtil, Visitor} from '@omnigen/core';
import {CodeRootAstNode} from '../CodeRootAstNode.ts';
import {CodeAstUtils} from '../CodeAstUtils.ts';
import {CodeOptions} from '../../options/CodeOptions.ts';

export class AddFieldsAstTransformer implements AstTransformer<CodeRootAstNode, TargetOptions & CodeOptions> {
  transformAst(args: AstTransformerArguments<CodeRootAstNode, TargetOptions & CodeOptions>): void {

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(Visitor.create(defaultVisitor, {

      visitClassDeclaration: (node, visitor) => {

        // Let's add all the fields that belong to this object.
        // It is up to other transformers to later add getters/setters or lombok (Java) or whatever language-specific.

        const type = node.type.omniType;
        const body = node.body;

        if (type.kind === OmniTypeKind.OBJECT) {

          const properties = OmniUtil.getPropertiesOf(type);
          for (const property of properties) {
            if (property.hidden) {
              continue;
            }

            // Add fields as "public" -- it is up to later transformers to add accessors and make it
            CodeAstUtils.addOmniPropertyToBlockAsField({root: args.root, property, body, options: args.options});
          }
        }

        // Then keep searching deeper, into nested types
        defaultVisitor.visitClassDeclaration(node, visitor);
      },
    }));
  }
}
