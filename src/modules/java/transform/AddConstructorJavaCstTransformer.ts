import {AbstractJavaCstTransformer} from '@java/transform/AbstractJavaCstTransformer';
import {OmniModel, OmniTypeKind} from '@parse';
import {
  ArgumentDeclaration,
  ClassDeclaration,
  ConstructorDeclaration,
  Field,
  JavaCstRootNode,
  JavaOptions,
  JavaUtil
} from '@java';
import * as Java from '@java/cst';
import {VisitorFactoryManager} from '@visit/VisitorFactoryManager';
import {Naming} from '@parse/Naming';

export class AddConstructorJavaCstTransformer extends AbstractJavaCstTransformer {

  transformCst(model: OmniModel, root: JavaCstRootNode, options: JavaOptions): Promise<void> {

    const classDeclarations: Java.ClassDeclaration[] = [];
    root.visit(VisitorFactoryManager.create(this._javaVisitor, {
      visitClassDeclaration: (node, visitor) => {
        this._javaVisitor.visitClassDeclaration(node, visitor); // Continue, so we look in nested classes.
        classDeclarations.push(node);
      },
      // visitGenericClassDeclaration: (node, visitor) => {
      //   this._javaVisitor.visitGenericClassDeclaration(node, visitor); // Continue, so we look in nested classes.
      //   classDeclarations.push(node);
      // },
    }));

    // TODO: Re-order the nodes, so that those that have no superclasses are first
    //        Or if they do, that it's in the correct order
    //  (this way we can better add constructors on subtypes, instead of working with required fields)
    classDeclarations.sort(AddConstructorJavaCstTransformer.compareDependencyHierarchy);

    // TODO: Skip the re-order and instead do it on a "need-to" basis, where we dive deeper here,
    //        and check if it has already been handled or already has constructor(s)

    for (const node of classDeclarations) {

      const superTypeRequirements = JavaUtil.getConstructorRequirements(root, node, true);

      if (superTypeRequirements[0].length > 0 || superTypeRequirements[1].length > 0) {

        const finalFields = superTypeRequirements[0];
        const superArgumentDeclarations = superTypeRequirements[1];

        const constructorDeclaration = this.createConstructorDeclaration(node, finalFields, superArgumentDeclarations);

        node.body.children.push(constructorDeclaration);
      }
    }

    return Promise.resolve(undefined);
  }

  private createConstructorDeclaration(
    node: ClassDeclaration,
    fields: Field[],
    superArguments: ArgumentDeclaration[]
  ): ConstructorDeclaration {

    const blockExpressions: Java.AbstractJavaNode[] = [];

    const ourArguments = this.addSuperConstructorCall(superArguments, node, blockExpressions);

    for (const constructorField of fields) {
      blockExpressions.push(new Java.Statement(new Java.AssignExpression(
        new Java.FieldReference(constructorField),
        new Java.VariableReference(constructorField.identifier)
      )));
    }

    const typeArguments = fields.map(it => new Java.ArgumentDeclaration(it.type, it.identifier));
    const allArguments = ourArguments.concat(typeArguments);

    return new Java.ConstructorDeclaration(
      node,
      new Java.ArgumentDeclarationList(
        // TODO: Can this be handled in a better way?
        //  To intrinsically link the argument to the field? A "FieldBackedArgumentDeclaration"? Too silly?
        ...allArguments
      ),
      new Java.Block(...blockExpressions)
    );
  }

  private static compareDependencyHierarchy(this: void, a: Java.ClassDeclaration, b: Java.ClassDeclaration): number {

    if (a.extends && !b.extends) {
      return 1;
    } else if (!a.extends && b.extends) {
      return -1;
    } else if (a.extends && b.extends) {

      // TODO: This is probably wrong? We should build an actual tree, and sort based on it?
      const aHierarchy = JavaUtil.getExtendHierarchy(a.type.omniType);
      const bHierarchy = JavaUtil.getExtendHierarchy(a.type.omniType);
      return aHierarchy.length - bHierarchy.length;
    }

    // Keep the order as-is.
    return 0;
  }

  private addSuperConstructorCall(
    superTypeRequirements: Java.ArgumentDeclaration[],
    node: Java.ClassDeclaration,
    blockExpressions: Java.AbstractJavaNode[]
  ): Java.ArgumentDeclaration[] {

    if (superTypeRequirements.length > 0) {
      return [];
    }

    const requiredSuperArguments: Java.ArgumentDeclaration[] = [];
    const superConstructorArguments: Java.AbstractExpression[] = [];
    for (const requiredArgument of superTypeRequirements) {
      const omniType = requiredArgument.type.omniType;
      if (omniType.kind == OmniTypeKind.PRIMITIVE && typeof omniType.valueConstant == 'function') {
        const requiredConstant = omniType.valueConstant(node.type.omniType);
        superConstructorArguments.push(new Java.Literal(requiredConstant));
      } else {
        superConstructorArguments.push(new Java.VariableReference(requiredArgument.identifier));
        const actualType = this.getResolvedGenericArgumentType(requiredArgument, node);
        requiredSuperArguments.push(new Java.ArgumentDeclaration(actualType, requiredArgument.identifier));
      }
    }

    blockExpressions.push(
      new Java.Statement(
        new Java.SuperConstructorCall(
          new Java.ArgumentList(...superConstructorArguments)
        )
      )
    );

    return requiredSuperArguments;
  }

  private getResolvedGenericArgumentType(requiredArgument: Java.ArgumentDeclaration, node: Java.ClassDeclaration): Java.Type {

    if (requiredArgument.type.omniType.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
      // The type is 'T' or something. Need to get the actual type from our current parent class.
      if (node.type.omniType.kind == OmniTypeKind.OBJECT) {
        const target = node.type.omniType.extendedBy;
        if (target && target.kind == OmniTypeKind.GENERIC_TARGET) {
          const foundGenericType = target.targetIdentifiers.find(it => {
            if (it.kind == OmniTypeKind.GENERIC_TARGET_IDENTIFIER) {
              if (it.sourceIdentifier == requiredArgument.type.omniType) {
                return true;
              }
            }

            return false;
          });

          if (foundGenericType) {
            return new Java.Type(foundGenericType.type);
          } else {
            const typeName = requiredArgument.identifier.value;
            const placeholderName = Naming.safer(requiredArgument.type.omniType);
            throw new Error(`Could not find the generic type of '${typeName}' ${placeholderName}`);
          }
        }
      }
    }

    // NOTE: This might be incorrect. Should throw more informational errors in else-cases above.
    return requiredArgument.type;
  }
}
