import {
  OmniUtil,
  VisitorFactoryManager,
} from '@omnigen/core';
import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from '../transform/index.js';

export class AddJakartaValidationAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): Promise<void> {

    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitClassDeclaration: (node, visitor) => {
        AbstractJavaAstTransformer.JAVA_VISITOR.visitClassDeclaration(node, visitor);
      },

      visitField: (node, visitor) => {

      },

      visitMethodDeclaration: (node, visitor) => {

        const returnType = node.signature.type.omniType;
        if (OmniUtil.isNull(returnType)) {

          if (node.signature.parameters) {
            for (const parameter of node.signature.parameters.children) {

              const parameterType = parameter.type.omniType;
            }
          }
        }

        // if (JavaUtil.isNullable())
      },

      visitConstructor: (node, visitor) => {

      },
    }));

    // let required = false;
    // if (it.type.omniType.kind == OmniTypeKind.PRIMITIVE) {
    //   required = (it.type.omniType.valueMode != OmniPrimitiveValueMode.LITERAL);
    // }

    // if (required) {
    //
    //   if (JavaUtil.isNullable(type.omniType) && !JavaUtil.getSpecifiedDefaultValue(type.omniType)) {
    //
    //     // TODO: Add the "required" to the JsonProperty annotation above!
    //     annotations.push(
    //       new Java.Annotation(
    //         new Java.RegularType({
    //           kind: OmniTypeKind.HARDCODED_REFERENCE,
    //           fqn: 'jakarta.validation.constraints.NotNull',
    //         }),
    //       ),
    //     );
    //   }
    // }

    return Promise.resolve(undefined);
  }
}
