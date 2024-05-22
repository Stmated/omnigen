import {AstNode, AstTransformer, AstTransformerArguments, OmniModel, Reference, RootAstNode, TargetOptions, TypeNode} from '@omnigen/core';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
import {CodeAstUtils} from '../CodeAstUtils';
import * as Code from '../CodeAst';
import {CodeRootAstNode} from '../CodeRootAstNode';
import {CodeOptions} from '../../options/CodeOptions.ts';
import {CodeUtil} from '../../util/CodeUtil.ts';
import {AbstractCodeNode} from '../AbstractCodeNode.ts';

/**
 * Adds a constructor to a class, based on what fields are required (final) and what fields are required from any potential supertype.
 */
export class AddConstructorCodeAstTransformer implements AstTransformer<CodeRootAstNode, TargetOptions & CodeOptions> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode, TargetOptions & CodeOptions>): void {

    const classDeclarations: Code.ClassDeclaration[] = [];

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {
      visitClassDeclaration: (node, visitor) => {
        defaultVisitor.visitClassDeclaration(node, visitor);
        classDeclarations.push(node);
      },
    }));

    classDeclarations.sort(
      (a, b) => AddConstructorCodeAstTransformer.compareSuperClassHierarchy(args.root, args.model, a, b),
    );

    for (const classDeclaration of classDeclarations) {

      const requirements = CodeAstUtils.getConstructorRequirements(args.root, classDeclaration, true);

      if (requirements.fields.length > 0 || requirements.parameters.length > 0) {

        const constructorDeclaration = this.createConstructorDeclaration(
          args.root, requirements.fields, requirements.parameters,
        );

        classDeclaration.body.children.push(constructorDeclaration);
      }
    }
  }

  private createConstructorDeclaration(
    root: RootAstNode,
    fields: Code.Field[],
    superParameters: Code.ConstructorParameter[],
  ): Code.ConstructorDeclaration {

    const blockExpressions: AbstractCodeNode[] = [];

    const [requiredSuperParameters, superCall] = this.addSuperConstructorCall(root, superParameters);
    const parameters: Code.ConstructorParameter[] = [];

    for (let i = 0; i < fields.length; i++) {

      const constructorField = fields[i];
      const constructorFieldRef = new Code.FieldReference(constructorField);
      const parameter = this.createConstructorParameter(constructorFieldRef, constructorField.type, constructorField.identifier);
      parameters.push(parameter);

      blockExpressions.push(new Code.Statement(new Code.AssignExpression(
        new Code.FieldReference(constructorField),
        new Code.DeclarationReference(parameter),
      )));
    }

    const allConstructorParameters = requiredSuperParameters.concat(parameters);

    const constructor = new Code.ConstructorDeclaration(
      new Code.ConstructorParameterList(...allConstructorParameters),
      new Code.Block(...blockExpressions),
    );

    // This will be moved to the constructor body in a later transformer.
    constructor.superCall = superCall;

    return constructor;
  }

  private static compareSuperClassHierarchy(root: CodeRootAstNode, model: OmniModel, a: Code.ClassDeclaration, b: Code.ClassDeclaration): number {

    if (a.extends && !b.extends) {
      return 1;
    } else if (!a.extends && b.extends) {
      return -1;
    } else if (a.extends && b.extends) {

      // TODO: This is probably wrong? We should build an actual tree, and sort based on it?
      const functions = root.getFunctions();
      const aHierarchy = CodeUtil.getSuperClassHierarchy(model, OmniUtil.asSubType(a.type.omniType) ? a.type.omniType : undefined, functions);
      const bHierarchy = CodeUtil.getSuperClassHierarchy(model, OmniUtil.asSubType(b.type.omniType) ? b.type.omniType : undefined, functions);
      return aHierarchy.length - bHierarchy.length;
    }

    // Keep the order as-is.
    return 0;
  }

  private addSuperConstructorCall(
    root: RootAstNode,
    superConstructorParameters: Code.ConstructorParameter[],
  ): [Code.ConstructorParameter[], Code.SuperConstructorCall | undefined] {

    if (superConstructorParameters.length == 0) {
      return [[], undefined];
    }

    const requiredSuperArguments: Code.ConstructorParameter[] = [];
    const superConstructorArguments: AbstractCodeNode[] = [];
    for (const superParameter of superConstructorParameters) {

      const type = superParameter.type.omniType;

      // Create a new node instance from the given type.
      const typeNode = superParameter.type;

      if (OmniUtil.isPrimitive(type) && type.literal) {
        const literalValue = type.value ?? null;
        superConstructorArguments.push(new Code.Literal(literalValue));
      } else if (OmniUtil.isPrimitive(type) && type.value !== undefined) {
        const parameter = this.createConstructorParameter(superParameter.ref, typeNode, superParameter.identifier);
        requiredSuperArguments.push(parameter);
        superConstructorArguments.push(new Code.DeclarationReference(parameter));
      } else {

        const constructorParam = this.createConstructorParameter(superParameter.ref, typeNode, superParameter.identifier);

        superConstructorArguments.push(new Code.DeclarationReference(constructorParam));
        requiredSuperArguments.push(constructorParam);
      }
    }

    const superCall = (superConstructorArguments.length > 0)
    ? new Code.SuperConstructorCall(new Code.ArgumentList(...superConstructorArguments))
      : undefined;

    return [requiredSuperArguments, superCall];
  }

  private createConstructorParameter(fieldRef: Reference<AstNode>, type: TypeNode, identifier: Code.Identifier): Code.ConstructorParameter {

    const schemaIdentifier = identifier.original || identifier.value;
    const safeName = CodeUtil.getPrettyParameterName(schemaIdentifier);

    let usedIdentifier = identifier;
    if (identifier.value != safeName) {
      usedIdentifier = new Code.Identifier(safeName, schemaIdentifier);
    }

    return new Code.ConstructorParameter(fieldRef, type, usedIdentifier);
  }
}
