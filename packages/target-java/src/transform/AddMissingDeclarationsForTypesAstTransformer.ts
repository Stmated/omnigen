import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.js';
import {VisitorFactoryManager} from '@omnigen/core-util';

/**
 * Used for adding in declarations for any types that exist among the AST, but does not have a related declaration.
 */
export class AddMissingDeclarationsForTypesAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    // args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {
    //   visitRegularType: node => {},
    //   visitGenericType: node => {},
    //
    //   visitObjectDeclaration: node => {
    //
    //   },
    //   visitInterfaceDeclaration: node => {
    //
    //   },
    // }));


  }
}
