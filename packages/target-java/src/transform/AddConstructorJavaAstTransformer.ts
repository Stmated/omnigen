import {AbstractJavaAstTransformer, JavaAstTransformerArgs, JavaAstUtils} from '../transform';
import {LiteralValue, OmniModel, OmniType, OmniTypeKind} from '@omnigen/core';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
import {FieldAccessorMode} from '../options';
import {JavaUtil} from '../util';
import * as Java from '../ast';
import {TokenKind} from '../ast';

/**
 * Adds a constructor to a class, based on what fields are required (final) and what fields are required from any potential supertype.
 */
export class AddConstructorJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    if (args.options.fieldAccessorMode == FieldAccessorMode.LOMBOK) {

      // If the fields are managed by lombok, then we add no constructor.
      return;
    }

    const classDeclarations: Java.ClassDeclaration[] = [];

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {
      visitClassDeclaration: (node, visitor) => {
        defaultVisitor.visitClassDeclaration(node, visitor); // Continue, so we look in nested classes.
        classDeclarations.push(node);
      },
    }));

    classDeclarations.sort((a, b) => AddConstructorJavaAstTransformer.compareSuperClassHierarchy(args.model, a, b));

    for (const classDeclaration of classDeclarations) {

      const requirements = JavaAstUtils.getConstructorRequirements(args.root, classDeclaration, true);

      if (requirements.fields.length > 0 || requirements.parameters.length > 0) {

        const constructorDeclaration = this.createConstructorDeclaration(
          classDeclaration, requirements.fields, requirements.parameters,
        );

        classDeclaration.body.children.push(constructorDeclaration);
      }
    }
  }

  private createConstructorDeclaration(
    node: Java.ClassDeclaration,
    fields: Java.Field[],
    superParameters: Java.ConstructorParameter[],
  ): Java.ConstructorDeclaration {

    const blockExpressions: Java.AbstractJavaNode[] = [];

    const requiredSuperParameters = this.addSuperConstructorCall(superParameters, node, blockExpressions);
    const parameters: Java.ConstructorParameter[] = [];

    for (let i = 0; i < fields.length; i++) {

      const constructorField = fields[i];
      const constructorFieldRef = new Java.FieldReference(constructorField);
      const parameter = this.createParameter(constructorFieldRef, constructorField.type, constructorField.identifier);
      parameters.push(parameter);

      const defaultValue = OmniUtil.getSpecifiedDefaultValue(constructorField.type.omniType);
      if (defaultValue !== undefined) {
        blockExpressions.push(this.createAssignmentWithFallback(parameter, constructorField, defaultValue));
      } else {
        blockExpressions.push(new Java.Statement(new Java.AssignExpression(
          new Java.FieldReference(constructorField),
          new Java.DeclarationReference(parameter),
        )));
      }
    }

    const allConstructorParameters = requiredSuperParameters.concat(parameters);

    return new Java.ConstructorDeclaration(
      new Java.ConstructorParameterList(
        // TODO: Can this be handled in a better way?
        //  To intrinsically link the argument to the field? A "FieldBackedArgumentDeclaration"? Too silly?
        ...allConstructorParameters,
      ),
      new Java.Block(...blockExpressions),
    );
  }

  private createAssignmentWithFallback(
    argumentDeclaration: Java.Parameter,
    targetField: Java.Field,
    defaultValue: LiteralValue,
  ): Java.IfElseStatement {

    return new Java.IfElseStatement(
      [
        new Java.IfStatement(
          new Java.Predicate(
            new Java.DeclarationReference(argumentDeclaration),
            TokenKind.NOT_EQUALS,
            new Java.Literal(null),
          ),
          new Java.Block(new Java.Statement(new Java.AssignExpression(
            new Java.FieldReference(targetField),
            new Java.DeclarationReference(argumentDeclaration),
          ))),
        ),
      ],
      new Java.Block(
        new Java.Statement(new Java.AssignExpression(
          new Java.FieldReference(targetField),
          new Java.Literal(defaultValue),
        )),
      ),
    );
  }

  private static compareSuperClassHierarchy(model: OmniModel, a: Java.ClassDeclaration, b: Java.ClassDeclaration): number {

    if (a.extends && !b.extends) {
      return 1;
    } else if (!a.extends && b.extends) {
      return -1;
    } else if (a.extends && b.extends) {

      // TODO: This is probably wrong? We should build an actual tree, and sort based on it?
      const aHierarchy = JavaUtil.getSuperClassHierarchy(model, JavaUtil.asSubType(a.type.omniType) ? a.type.omniType : undefined);
      const bHierarchy = JavaUtil.getSuperClassHierarchy(model, JavaUtil.asSubType(b.type.omniType) ? b.type.omniType : undefined);
      return aHierarchy.length - bHierarchy.length;
    }

    // Keep the order as-is.
    return 0;
  }

  private addSuperConstructorCall(
    superTypeRequirements: Java.ConstructorParameter[],
    node: Java.ClassDeclaration,
    blockExpressions: Java.AbstractJavaNode[],
  ): Java.ConstructorParameter[] {

    if (superTypeRequirements.length == 0) {
      return [];
    }

    const requiredSuperArguments: Java.ConstructorParameter[] = [];
    const superConstructorArguments: Java.AbstractJavaExpression[] = [];
    for (const requiredArgument of superTypeRequirements) {
      const resolvedType = this.getResolvedGenericArgumentType(requiredArgument, node);
      const type = resolvedType.omniType;
      if (type.kind == OmniTypeKind.PRIMITIVE && type.literal) {
        const literalValue = type.value ?? null;
        superConstructorArguments.push(new Java.Literal(literalValue));
      } else if (type.kind == OmniTypeKind.PRIMITIVE && type.value !== undefined) {
        const literalValue = type.value ?? null;
        const parameter = this.createParameter(requiredArgument.field, resolvedType, requiredArgument.identifier);
        requiredSuperArguments.push(parameter);
        superConstructorArguments.push(new Java.TernaryExpression(
          new Java.Predicate(
            new Java.DeclarationReference(parameter),
            TokenKind.EQUALS,
            new Java.Literal(null),
          ),
          new Java.Literal(literalValue),
          new Java.DeclarationReference(parameter),
        ));
      } else {
        superConstructorArguments.push(new Java.DeclarationReference(requiredArgument));
        requiredSuperArguments.push(this.createParameter(requiredArgument.field, resolvedType, requiredArgument.identifier));
      }
    }

    if (superConstructorArguments.length > 0) {
      blockExpressions.push(
        new Java.Statement(
          new Java.SuperConstructorCall(
            new Java.ArgumentList(...superConstructorArguments),
          ),
        ),
      );
    }

    return requiredSuperArguments;
  }

  private createParameter(fieldRef: Java.FieldReference, type: Java.TypeNode, identifier: Java.Identifier): Java.ConstructorParameter {

    const schemaIdentifier = identifier.original || identifier.value;
    const safeName = JavaUtil.getPrettyParameterName(schemaIdentifier);

    let usedIdentifier = identifier;
    if (identifier.value != safeName) {
      usedIdentifier = new Java.Identifier(safeName, schemaIdentifier);
    }

    return new Java.ConstructorParameter(
      fieldRef,
      type,
      usedIdentifier,
    );
  }

  private getResolvedGenericArgumentType(requiredArgument: Java.Parameter, node: Java.ClassDeclaration): Java.TypeNode<OmniType> {

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
            const placeholderName = OmniUtil.describe(requiredArgument.type.omniType);
            throw new Error(`Could not find the generic type of '${typeName}' ${placeholderName}`);
          }
        }
      }
    }

    // NOTE: This might be incorrect. Should throw more informational errors in else-cases above.
    return requiredArgument.type;
  }
}
