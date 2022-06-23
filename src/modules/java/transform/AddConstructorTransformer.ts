import {AbstractJavaTransformer} from '@java/transform/AbstractJavaTransformer';
import {GenericModel} from '@parse';
import {JavaCstRootNode, JavaOptions, JavaUtil} from '@java';
import * as Java from '@java/cst';
import {JavaVisitor} from '@java/visit/JavaVisitor';
import {VisitorFactoryManager} from '@visit/VisitorFactoryManager';

export class AddConstructorTransformer extends AbstractJavaTransformer {

  private readonly _javaVisitor = new JavaVisitor<void>();

  transform(model: GenericModel, root: JavaCstRootNode, options: JavaOptions): Promise<void> {

    const classDeclarations: Java.ClassDeclaration[] = [];
    root.visit(VisitorFactoryManager.create(this._javaVisitor, {
      visitClassDeclaration: (node, visitor) => {
        this._javaVisitor.visitClassDeclaration(node, visitor); // Continue, so we look in nested classes.

        classDeclarations.push(node);
      }
    }));

    // TODO: Re-order the nodes, so that those that have no superclasses are first
    //        Or if they do, that it's in the correct order
    //  (this way we can better add constructors on subtypes, instead of working with required fields)
    classDeclarations.sort((a, b) => {

      if (a.extends && !b.extends) {
        return 1;
      } else if (!a.extends && b.extends) {
        return -1;
      } else if (a.extends && b.extends) {

        // TODO: This is probably wrong? We should build an actual tree, and sort based on it?
        const aHierarchy = JavaUtil.getExtendHierarchy(a.type.genericType);
        const bHierarchy = JavaUtil.getExtendHierarchy(a.type.genericType);
        return aHierarchy.length - bHierarchy.length;
      }

      // Keep the order as-is.
      return 0;
    });

    // TODO: Skip the re-order and instead do it on a "need-to" basis, where we dive deeper here, and check if it has already been handled or already has constructor(s)

    for (const node of classDeclarations) {

      const constructorFields = JavaUtil.getFieldsRequiredInConstructor(root, node, true);
      if (constructorFields[0].length > 0 || constructorFields[1].length > 0) {

        // TODO: Move this into another transformer
        //  One that checks for "final" fields without setters, and adds a constructor.
        //  This is much more dynamic and could be called by an implementor at another stage.

        const blockExpressions: Java.AbstractJavaNode[] = [];
        if (constructorFields[1].length > 0) {
          blockExpressions.push(
            new Java.Statement(
              new Java.SuperConstructorCall(
                new Java.ArgumentList(
                  ...constructorFields[1].map(it => new Java.VariableReference(it.identifier))
                )
              )
            )
          )
        }

        blockExpressions.push(...constructorFields[0].map(it => new Java.Statement(new Java.AssignExpression(
          new Java.FieldReference(it),
          new Java.VariableReference(it.identifier)
        ))));

        const allParameters = constructorFields[0].concat(constructorFields[1]);

        node.body.children.push(new Java.ConstructorDeclaration(
          node,
          new Java.ArgumentDeclarationList(
            // TODO: Can this be handled in a better way?
            //  To intrinsically link the argument to the field? A "FieldBackedArgumentDeclaration"? Too silly?
            ...allParameters.map(it => new Java.ArgumentDeclaration(it.type, it.identifier))
          ),
          new Java.Block(...blockExpressions)
        ))
      }
    }

    return Promise.resolve(undefined);
  }
}
