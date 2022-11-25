import {AbstractJavaAstTransformer, JavaAstUtils} from '../transform/index.js';
import {
  AbortVisitingWithResult,
  ExternalSyntaxTree, LiteralValue,
  OmniModel,
  OmniPrimitiveValueMode,
  OmniTypeKind,
  OmniUtil,
  RealOptions,
  VisitorFactoryManager,
  VisitResultFlattener,
} from '@omnigen/core';
import {FieldAccessorMode, JavaOptions} from '../options/index.js';
import {JavaUtil} from '../util/index.js';
import * as Java from '../ast/index.js';
import {TokenType} from '../ast/index.js';

export class AddConstructorJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(
    model: OmniModel,
    root: Java.JavaAstRootNode,
    _externals: ExternalSyntaxTree<Java.JavaAstRootNode, JavaOptions>[],
    _options: RealOptions<JavaOptions>,
  ): Promise<void> {

    if (_options.fieldAccessorMode == FieldAccessorMode.LOMBOK) {

      // If the fields are managed by lombok, then we add no constructor.
      return Promise.resolve();
    }

    const classDeclarations: Java.ClassDeclaration[] = [];
    root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {
      visitClassDeclaration: (node, visitor) => {
        AbstractJavaAstTransformer.JAVA_VISITOR.visitClassDeclaration(node, visitor); // Continue, so we look in nested classes.
        classDeclarations.push(node);
      },
    }));

    // TODO: Re-order the nodes, so that those that have no superclasses are first
    //        Or if they do, that it's in the correct order
    //  (this way we can better add constructors on subtypes, instead of working with required fields)
    classDeclarations.sort((a, b) => AddConstructorJavaAstTransformer.compareSuperClassHierarchy(model, a, b));

    // TODO: Skip the re-order and instead do it on a "need-to" basis, where we dive deeper here,
    //        and check if it has already been handled or already has constructor(s)

    for (const classDeclaration of classDeclarations) {

      const superTypeRequirements = JavaUtil.getConstructorRequirements(root, classDeclaration, true);

      if (superTypeRequirements[0].length > 0 || superTypeRequirements[1].length > 0) {

        const finalFields = superTypeRequirements[0];
        const superArgumentDeclarations = superTypeRequirements[1];

        const visitor = VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_BOOLEAN_VISITOR, {
          visitAnnotation: node => {
            if (node.type.omniType.kind == OmniTypeKind.HARDCODED_REFERENCE) {
              if (node.type.omniType.fqn.indexOf('JsonValue') >= 0) {
                throw new AbortVisitingWithResult(true);
              }
            }
          },
        });

        const hasJsonValue = VisitResultFlattener.visitWithSingularResult(visitor, classDeclaration.body, false);

        const constructorDeclaration = this.createConstructorDeclaration(classDeclaration, finalFields, superArgumentDeclarations);

        if (hasJsonValue) {
          if (!constructorDeclaration.annotations) {
            constructorDeclaration.annotations = new Java.AnnotationList(...[]);
          }

          if (!constructorDeclaration.parameters || constructorDeclaration.parameters.children.length <= 1) {
            constructorDeclaration.annotations.children.push(
              new Java.Annotation(
                new Java.RegularType({
                  kind: OmniTypeKind.HARDCODED_REFERENCE,
                  fqn: 'com.fasterxml.jackson.annotation.JsonCreator',
                }),
              ),
            );
          }
        }

        classDeclaration.body.children.push(constructorDeclaration);
      }
    }

    return Promise.resolve(undefined);
  }

  private createConstructorDeclaration(
    node: Java.ClassDeclaration,
    fields: Java.Field[],
    superArguments: Java.ArgumentDeclaration[],
  ): Java.ConstructorDeclaration {

    const blockExpressions: Java.AbstractJavaNode[] = [];

    const ourArguments = this.addSuperConstructorCall(superArguments, node, blockExpressions);

    const typeArguments = fields.map(it => {
      return this.createArgumentDeclaration(it.type, it.identifier);
    });

    for (let i = 0; i < fields.length; i++) {
      const constructorField = fields[i];
      const argumentDeclaration = typeArguments[i];

      const defaultValue = JavaUtil.getSpecifiedDefaultValue(constructorField.type.omniType);
      if (defaultValue !== undefined) {
        blockExpressions.push(this.createAssignmentWithFallback(argumentDeclaration, constructorField, defaultValue));
      } else {
        blockExpressions.push(new Java.Statement(new Java.AssignExpression(
          new Java.FieldReference(constructorField),
          new Java.VariableReference(argumentDeclaration.identifier),
        )));
      }
    }

    const allArguments = ourArguments.concat(typeArguments);

    return new Java.ConstructorDeclaration(
      node,
      new Java.ArgumentDeclarationList(
        // TODO: Can this be handled in a better way?
        //  To intrinsically link the argument to the field? A "FieldBackedArgumentDeclaration"? Too silly?
        ...allArguments,
      ),
      new Java.Block(...blockExpressions),
    );
  }

  private createAssignmentWithFallback(
    argumentDeclaration: Java.ArgumentDeclaration,
    targetField: Java.Field,
    defaultValue: LiteralValue,
  ): Java.IfElseStatement {

    return new Java.IfElseStatement(
      [
        new Java.IfStatement(
          new Java.Predicate(
            new Java.VariableReference(argumentDeclaration.identifier),
            TokenType.NOT_EQUALS,
            new Java.Literal(null),
          ),
          new Java.Block(new Java.Statement(new Java.AssignExpression(
            new Java.FieldReference(targetField),
            new Java.VariableReference(argumentDeclaration.identifier),
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
      const aHierarchy = JavaUtil.getSuperClassHierarchy(model, JavaUtil.asSubType(a.type.omniType));
      const bHierarchy = JavaUtil.getSuperClassHierarchy(model, JavaUtil.asSubType(a.type.omniType));
      return aHierarchy.length - bHierarchy.length;
    }

    // Keep the order as-is.
    return 0;
  }

  private addSuperConstructorCall(
    superTypeRequirements: Java.ArgumentDeclaration[],
    node: Java.ClassDeclaration,
    blockExpressions: Java.AbstractJavaNode[],
  ): Java.ArgumentDeclaration[] {

    if (superTypeRequirements.length == 0) {
      return [];
    }

    const requiredSuperArguments: Java.ArgumentDeclaration[] = [];
    const superConstructorArguments: Java.AbstractExpression[] = [];
    for (const requiredArgument of superTypeRequirements) {
      superConstructorArguments.push(new Java.VariableReference(requiredArgument.identifier));
      const actualType = this.getResolvedGenericArgumentType(requiredArgument, node);
      requiredSuperArguments.push(this.createArgumentDeclaration(actualType, requiredArgument.identifier));
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


  private createArgumentDeclaration(type: Java.Type, identifier: Java.Identifier): Java.ArgumentDeclaration {

    const annotations: Java.Annotation[] = [];
    const schemaIdentifier = identifier.original || identifier.value;
    const safeName = JavaUtil.getPrettyArgumentName(schemaIdentifier);
    if (schemaIdentifier != safeName || (identifier.original && identifier.original != safeName)) {

      annotations.push(
        new Java.Annotation(
          new Java.RegularType({
            kind: OmniTypeKind.HARDCODED_REFERENCE,
            fqn: 'com.fasterxml.jackson.annotation.JsonProperty',
          }),
          new Java.AnnotationKeyValuePairList(
            new Java.AnnotationKeyValuePair(
              undefined,
              new Java.Literal(schemaIdentifier),
            ),
          ),
        ),
      );
    }

    let usedIdentifier = identifier;
    if (identifier.value != safeName) {
      usedIdentifier = new Java.Identifier(safeName, schemaIdentifier);
    }

    let annotationList: Java.AnnotationList | undefined = undefined;
    if (annotations.length > 0) {
      annotationList = new Java.AnnotationList(...annotations);
      annotationList.multiline = false;
    }

    return new Java.ArgumentDeclaration(
      type,
      usedIdentifier,
      annotationList,
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
