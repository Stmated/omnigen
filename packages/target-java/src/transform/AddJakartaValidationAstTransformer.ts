import {
  ExternalSyntaxTree,
  OmniModel,
  OmniUtil,
  RealOptions,
  VisitorFactoryManager,
} from '@omnigen/core';
import {JavaOptions} from '../options/index.js';
import {AbstractJavaAstTransformer} from '../transform/index.js';
import * as Java from '../ast/index.js';

export class AddJakartaValidationAstTransformer extends AbstractJavaAstTransformer {

  transformAst(
    _model: OmniModel,
    root: Java.JavaAstRootNode,
    _externals: ExternalSyntaxTree<Java.JavaAstRootNode, JavaOptions>[],
    options: RealOptions<JavaOptions>,
  ): Promise<void> {

    root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

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
