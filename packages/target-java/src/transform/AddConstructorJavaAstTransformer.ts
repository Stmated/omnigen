import {AbstractJavaAstTransformer, JavaAstUtils} from '../transform';
import {OmniModel, OmniTypeKind, OmniUtil} from '@omnigen/core';
import {IJavaOptions} from '../options';
import {RealOptions, ExternalSyntaxTree, VisitorFactoryManager} from '@omnigen/core';
import {JavaUtil} from '../util';
import * as Java from '../ast';

export class AddConstructorJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(
    model: OmniModel,
    root: Java.JavaAstRootNode,
    externals: ExternalSyntaxTree<Java.JavaAstRootNode, IJavaOptions>[],
    options: RealOptions<IJavaOptions>
  ): Promise<void> {

    const classDeclarations: Java.ClassDeclaration[] = [];
    root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer._javaVisitor, {
      visitClassDeclaration: (node, visitor) => {
        AbstractJavaAstTransformer._javaVisitor.visitClassDeclaration(node, visitor); // Continue, so we look in nested classes.
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
    classDeclarations.sort(AddConstructorJavaAstTransformer.compareDependencyHierarchy);

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
    node: Java.ClassDeclaration,
    fields: Java.Field[],
    superArguments: Java.ArgumentDeclaration[]
  ): Java.ConstructorDeclaration {

    const blockExpressions: Java.AbstractJavaNode[] = [];

    const ourArguments = this.addSuperConstructorCall(superArguments, node, blockExpressions);

    const typeArguments = fields.map(it => {
      let required = false;
      if (it.type.omniType.kind == OmniTypeKind.PRIMITIVE) {
        required = (it.type.omniType.valueConstantOptional == false);
      }
      return this.createArgumentDeclaration(it.type, it.identifier, required);
    });

    for (let i = 0; i < fields.length; i++) {
      const constructorField = fields[i];
      const argumentDeclaration = typeArguments[i];
      blockExpressions.push(new Java.Statement(new Java.AssignExpression(
        new Java.FieldReference(constructorField),
        new Java.VariableReference(argumentDeclaration.identifier)
      )));
    }

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

    if (superTypeRequirements.length == 0) {
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
        requiredSuperArguments.push(this.createArgumentDeclaration(actualType, requiredArgument.identifier, false));
      }
    }

    if (superConstructorArguments.length > 0) {
      blockExpressions.push(
        new Java.Statement(
          new Java.SuperConstructorCall(
            new Java.ArgumentList(...superConstructorArguments)
          )
        )
      );
    }

    return requiredSuperArguments;
  }


  private createArgumentDeclaration(type: Java.Type, identifier: Java.Identifier, required: boolean): Java.ArgumentDeclaration {

    const annotations: Java.Annotation[] = [];
    const schemaIdentifier = identifier.original || identifier.value;
    const safeName = JavaUtil.getPrettyArgumentName(schemaIdentifier);
    if (schemaIdentifier != safeName || (identifier.original && identifier.original != safeName)) {

      // TODO: Need to test if this actually works -- currently there is no test for it
      annotations.push(
        new Java.Annotation(
          new Java.RegularType({
            kind: OmniTypeKind.HARDCODED_REFERENCE,
            fqn: "com.fasterxml.jackson.annotation.JsonProperty",
          }),
          new Java.AnnotationKeyValuePairList(
            new Java.AnnotationKeyValuePair(
              undefined,
              new Java.Literal(schemaIdentifier)
            ),
          )
        )
      );
    }

    let usedIdentifier = identifier;
    if (identifier.value != safeName) {
      usedIdentifier = new Java.Identifier(safeName, schemaIdentifier);
    }

    if (required) {

      if (JavaUtil.isNullable(type.omniType)) {

        // TODO: Add the "required" to the JsonProperty annotation above!
        annotations.push(
          new Java.Annotation(
            new Java.RegularType({
              kind: OmniTypeKind.HARDCODED_REFERENCE,
              fqn: "javax.validation.constraints.NotNull",
            }),
          )
        );
      }
    }

    let annotationList: Java.AnnotationList | undefined = undefined;
    if (annotations.length > 0) {
      annotationList = new Java.AnnotationList(...annotations);
      annotationList.multiline = false;
    }

    return new Java.ArgumentDeclaration(
      type,
      usedIdentifier,
      annotationList
    );
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
            return JavaAstUtils.createTypeNode(foundGenericType.type);
          } else {
            const typeName = requiredArgument.identifier.value;
            const placeholderName = OmniUtil.getTypeDescription(requiredArgument.type.omniType);
            throw new Error(`Could not find the generic type of '${typeName}' ${placeholderName}`);
          }
        }
      }
    }

    // NOTE: This might be incorrect. Should throw more informational errors in else-cases above.
    return requiredArgument.type;
  }
}
