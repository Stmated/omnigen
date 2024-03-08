import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from '../transform/index.js';

export class AddJakartaValidationAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    // args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {
    //
    //   visitClassDeclaration: (node, visitor) => {
    //     AbstractJavaAstTransformer.JAVA_VISITOR.visitClassDeclaration(node, visitor);
    //   },
    //
    //   visitField: (node, visitor) => {
    //
    //   },
    //
    //   visitMethodDeclaration: (node, visitor) => {
    //
    //     const returnType = node.signature.type.omniType;
    //     if (OmniUtil.isNull(returnType)) {
    //
    //       if (node.signature.parameters) {
    //         for (const parameter of node.signature.parameters.children) {
    //           const parameterType = parameter.type.omniType;
    //         }
    //       }
    //     }
    //   },
    //
    //   visitConstructor: (node, visitor) => {
    //
    //   },
    // }));
  }
}
