import {AbstractJavaAstTransformer, JavaAstTransformerArgs, JavaAstUtils} from '../transform';
import {LiteralValue, OmniModel, RootAstNode, TypeNode} from '@omnigen/core';
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
        defaultVisitor.visitClassDeclaration(node, visitor);
        classDeclarations.push(node);
      },
    }));

    classDeclarations.sort((a, b) => AddConstructorJavaAstTransformer.compareSuperClassHierarchy(args.model, a, b));

    for (const classDeclaration of classDeclarations) {

      const requirements = JavaAstUtils.getConstructorRequirements(args.root, classDeclaration, true);

      if (requirements.fields.length > 0 || requirements.parameters.length > 0) {

        const constructorDeclaration = this.createConstructorDeclaration(
          args.root, classDeclaration, requirements.fields, requirements.parameters,
        );

        classDeclaration.body.children.push(constructorDeclaration);
      }
    }
  }

  private createConstructorDeclaration(
    root: RootAstNode,
    node: Java.ClassDeclaration,
    fields: Java.Field[],
    superParameters: Java.ConstructorParameter[],
  ): Java.ConstructorDeclaration {

    const blockExpressions: Java.AbstractJavaNode[] = [];

    const requiredSuperParameters = this.addSuperConstructorCall(root, superParameters, node, blockExpressions);
    const parameters: Java.ConstructorParameter[] = [];

    for (let i = 0; i < fields.length; i++) {

      const constructorField = fields[i];
      const constructorFieldRef = new Java.FieldReference(constructorField);
      const parameter = this.createConstructorParameter(constructorFieldRef, constructorField.type, constructorField.identifier);
      parameters.push(parameter);

      // const defaultValue = OmniUtil.getSpecifiedDefaultValue(constructorField.type.omniType);
      // if (defaultValue !== undefined) {
      //   blockExpressions.push(this.createAssignmentWithFallback(parameter, constructorField, defaultValue));
      // } else {
        blockExpressions.push(new Java.Statement(new Java.AssignExpression(
          new Java.FieldReference(constructorField),
          new Java.DeclarationReference(parameter),
        )));
      // }
    }

    const allConstructorParameters = requiredSuperParameters.concat(parameters);

    return new Java.ConstructorDeclaration(
      new Java.ConstructorParameterList(...allConstructorParameters),
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
    root: RootAstNode,
    superConstructorParameters: Java.ConstructorParameter[],
    node: Java.ClassDeclaration,
    blockExpressions: Java.AbstractJavaNode[],
  ): Java.ConstructorParameter[] {

    if (superConstructorParameters.length == 0) {
      return [];
    }

    const requiredSuperArguments: Java.ConstructorParameter[] = [];
    const superConstructorArguments: Java.AbstractJavaExpression[] = [];
    for (const superParameter of superConstructorParameters) {

      const type = superParameter.type.omniType;

      // Create a new node instance from the given type.
      const typeNode = root.getAstUtils().createTypeNode(superParameter.type.omniType);

      if (OmniUtil.isPrimitive(type) && type.literal) {
        const literalValue = type.value ?? null;
        superConstructorArguments.push(new Java.Literal(literalValue));
      } else if (OmniUtil.isPrimitive(type) && type.value !== undefined) {
        // const literalValue = type.value ?? null;
        const parameter = this.createConstructorParameter(superParameter.fieldRef, typeNode, superParameter.identifier);
        requiredSuperArguments.push(parameter);
        superConstructorArguments.push(new Java.DeclarationReference(parameter));
        // superConstructorArguments.push(new Java.TernaryExpression(
        //   new Java.Predicate(
        //     new Java.DeclarationReference(parameter),
        //     TokenKind.EQUALS,
        //     new Java.Literal(null),
        //   ),
        //   new Java.Literal(literalValue),
        //   new Java.DeclarationReference(parameter),
        // ));
      } else {

        const constructorParam = this.createConstructorParameter(superParameter.fieldRef, typeNode, superParameter.identifier);

        superConstructorArguments.push(new Java.DeclarationReference(constructorParam));
        requiredSuperArguments.push(constructorParam);
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

  private createConstructorParameter(fieldRef: Java.FieldReference, type: TypeNode, identifier: Java.Identifier): Java.ConstructorParameter {

    const schemaIdentifier = identifier.original || identifier.value;
    const safeName = JavaUtil.getPrettyParameterName(schemaIdentifier);

    let usedIdentifier = identifier;
    if (identifier.value != safeName) {
      usedIdentifier = new Java.Identifier(safeName, schemaIdentifier);
    }

    return new Java.ConstructorParameter(fieldRef, type, usedIdentifier);
  }
}
