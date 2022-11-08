import {AbstractJavaAstTransformer} from './AbstractJavaAstTransformer';
import {
  Case,
  ExternalSyntaxTree,
  OmniModel, OmniPrimitiveType,
  OmniProperty,
  OmniTypeKind,
  RealOptions,
  VisitorFactoryManager,
} from '@omnigen/core';
import {JavaAstRootNode} from '../ast';
import {JavaOptions} from '../options';
import {JavaUtil} from '../util';
import * as Java from '../ast';
import {JavaAstUtils} from './JavaAstUtils';
import {BaseJavaAstTransformer} from './BaseJavaAstTransformer';

export class AddFieldsAstTransformer extends AbstractJavaAstTransformer {
  transformAst(
    model: OmniModel,
    root: JavaAstRootNode,
    _externals: ExternalSyntaxTree<JavaAstRootNode, JavaOptions>[],
    options: RealOptions<JavaOptions>,
  ): Promise<void> {

    root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitClassDeclaration: node => {

        // Let's add all the fields that belong to this object.
        // It is up to other transformers to later add getters/setters or lombok (Java) or whatever language-specific.

        const type = node.type.omniType;
        const body = node.body;

        if (type.kind == OmniTypeKind.OBJECT) {

          for (const property of type.properties) {
            this.addOmniPropertyToBody(model, body, property, options);
          }

          if (type.additionalProperties) {

            if (!JavaUtil.superMatches(model, type, parent => parent.kind == OmniTypeKind.OBJECT && parent.additionalProperties == true)) {

              // No parent implements additional properties, so we should.
              body.children.push(new Java.AdditionalPropertiesDeclaration());
            }
          }
        }

        for (const property of JavaUtil.collectUnimplementedPropertiesFromInterfaces(type)) {
          this.addOmniPropertyToBody(model, body, property, options);
        }
      },
    }));

    return Promise.resolve();
  }

  private addOmniPropertyToBody(model: OmniModel, body: Java.Block, property: OmniProperty, options: JavaOptions): void {

    const commentList = this.getCommentsList(property, model, options);

    if (property.type.kind == OmniTypeKind.NULL) {

      if (options.includeAlwaysNullProperties) {

        // We're told to include it, even though it always returns null.
        const methodDeclaration = new Java.MethodDeclaration(
          new Java.MethodDeclarationSignature(
            new Java.Identifier(JavaUtil.getGetterName(property.name, property.type), property.name),
            JavaAstUtils.createTypeNode(property.type),
          ),
          new Java.Block(
            new Java.Statement(new Java.ReturnStatement(new Java.Literal(null))),
          ),
        );

        methodDeclaration.signature.comments = commentList;
        body.children.push(methodDeclaration);
      }

      return;
    }

    if (property.type.kind == OmniTypeKind.PRIMITIVE && property.type.valueConstant) {
      this.addPrimitivePropertyAsField(property, property.type, body, commentList);
      return;
    }

    const fieldType = JavaAstUtils.createTypeNode(property.type);
    const fieldIdentifier = new Java.Identifier(property.fieldName || Case.camel(property.name), property.name);

    const field = new Java.Field(
      fieldType,
      fieldIdentifier,
      new Java.ModifierList(
        new Java.Modifier(Java.ModifierType.PRIVATE),
      ),
    );
    field.property = property;
    field.comments = commentList;
    field.annotations = this.getGetterAnnotations(property);

    if (options.immutableModels) {
      field.modifiers.children.push(new Java.Modifier(Java.ModifierType.FINAL));
    }

    body.children.push(field);
  }

  private getCommentsList(property: OmniProperty, model: OmniModel, options: JavaOptions) {

    const comments: string[] = [];
    if (property.type.kind != OmniTypeKind.OBJECT) {

      // If the type is not an object, then we will never create a class just for its sake.
      // So we should propagate all the examples and all other data we can find about it, to the property's comments.
      comments.push(...BaseJavaAstTransformer.getCommentsForType(property.type, model, options));

      if (property.type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

        const staticArrayStrings = property.type.properties.map((prop, idx) => {
          const typeName = JavaUtil.getFullyQualifiedName(prop.type);
          const parameterName = prop.name;
          const description = prop.description || prop.type.description;
          return `[${idx}] ${typeName} ${parameterName}${(description ? ` - ${description}` : '')}`;
        });

        comments.push(`Array with parameters in this order:\n${staticArrayStrings.join('\n')}`);
      }
    }

    if (property.description && !comments.includes(property.description)) {

      // Sometimes a description can be set both to the property itself and its type.
      comments.push(property.description);
    }

    if (property.summary && !comments.includes(property.summary)) {
      comments.push(property.summary);
    }

    if (property.deprecated) {
      comments.push('@deprecated');
    }

    if (property.required) {
      // TODO: Remove this, it should be apparent by the type of the property, no?
      comments.push('Required');
    }

    comments.push(...this.getLinkCommentsForProperty(property, model, options));

    const commentList = (comments.length > 0) ? new Java.CommentList(...comments.map(it => new Java.Comment(it))) : undefined;
    return commentList;
  }

  private getLinkCommentsForProperty(property: OmniProperty, model: OmniModel, options: JavaOptions): string[] {
    const comments: string[] = [];
    if (!options.includeLinksOnProperty) {
      return comments;
    }

    const linkComments: string[] = [];
    for (const continuation of (model.continuations || [])) {
      for (const mapping of continuation.mappings) {
        if (mapping.source.propertyPath?.length) {
          if (mapping.source.propertyPath[mapping.source.propertyPath.length - 1] == property) {
            linkComments.push(BaseJavaAstTransformer.getMappingSourceTargetComment(mapping, options, 'target'));
          }
        }

        if (mapping.target.propertyPath.length) {
          if (mapping.target.propertyPath[mapping.target.propertyPath.length - 1] == property) {
            linkComments.push(BaseJavaAstTransformer.getMappingSourceTargetComment(mapping, options, 'source'));
          }
        }
      }
    }

    if (linkComments.length > 0) {
      comments.push(linkComments.join('\n'));
    }

    return comments;
  }

  private addPrimitivePropertyAsField(
    property: OmniProperty,
    type: OmniPrimitiveType,
    body: Java.Block,
    commentList?: Java.CommentList,
  ): void {

    const fieldModifiers = new Java.ModifierList(
      new Java.Modifier(Java.ModifierType.PRIVATE),
      new Java.Modifier(Java.ModifierType.FINAL),
    );

    const field = new Java.Field(
      JavaAstUtils.createTypeNode(type),
      new Java.Identifier(`${JavaUtil.getSafeIdentifierName(property.fieldName || property.name)}`, property.name),
      fieldModifiers,
    );

    const methodDeclarationReturnType = type.valueConstant && JavaUtil.isNullable(type)
      ? JavaAstUtils.createTypeNode(JavaUtil.toUnboxedPrimitiveType(type))
      : JavaAstUtils.createTypeNode(type);

    const methodDeclarationSignature = new Java.MethodDeclarationSignature(
      new Java.Identifier(JavaUtil.getGetterName(property.name, type), property.name),
      methodDeclarationReturnType,
      undefined,
      undefined,
      this.getGetterAnnotations(property),
    );

    // TODO: Some of this should very likely be moved to another transformer! Since these are NOT fields!
    if (typeof type.valueConstant == 'function') {

      // This constant is dynamic based on the type that the property is owned by.
      const methodDeclaration = new Java.MethodDeclaration(
        methodDeclarationSignature,
        new Java.Block(
          new Java.Statement(new Java.ReturnStatement(
            new Java.FieldReference(field),
          )),
        ),
      );

      methodDeclaration.signature.comments = commentList;
      body.children.push(field);
      body.children.push(methodDeclaration);

    } else {

      let methodBlock: Java.Block;
      if (type.valueConstant && type.valueConstantOptional !== false) {
        methodBlock = new Java.Block(
          new Java.IfStatement(
            new Java.Predicate(
              new Java.FieldReference(field),
              Java.TokenType.NOT_EQUALS,
              new Java.Literal(null),
            ),
            new Java.Block(
              new Java.Statement(new Java.ReturnStatement(new Java.FieldReference(field))),
            ),
          ),
          new Java.Statement(new Java.ReturnStatement(new Java.Literal(type.valueConstant, type.primitiveKind))),
        );
      } else {
        methodBlock = new Java.Block(
          new Java.Statement(new Java.ReturnStatement(new Java.FieldReference(field))),
        );
      }

      const methodDeclaration = new Java.MethodDeclaration(
        methodDeclarationSignature,
        methodBlock,
      );

      methodDeclaration.signature.comments = commentList;
      body.children.push(field);
      body.children.push(methodDeclaration);
    }
  }

  private getGetterAnnotations(property: OmniProperty): Java.AnnotationList | undefined {

    // TODO: Move this to another transformer which checks for differences between field name and original name.
    const getterAnnotations: Java.Annotation[] = [];
    if (property.fieldName || property.propertyName) {
      getterAnnotations.push(
        new Java.Annotation(
          new Java.RegularType({
            kind: OmniTypeKind.HARDCODED_REFERENCE,
            fqn: 'com.fasterxml.jackson.annotation.JsonProperty',
          }),
          new Java.AnnotationKeyValuePairList(
            new Java.AnnotationKeyValuePair(
              undefined,
              new Java.Literal(property.name),
            ),
          ),
        ),
      );
    }

    return (getterAnnotations.length > 0)
      ? new Java.AnnotationList(...getterAnnotations)
      : undefined;
  }
}
