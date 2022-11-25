import {AbstractJavaAstTransformer} from './AbstractJavaAstTransformer.js';
import {
  Case,
  ExternalSyntaxTree,
  OmniModel,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniPrimitiveValueMode,
  OmniProperty,
  OmniTypeKind,
  RealOptions,
  VisitorFactoryManager,
} from '@omnigen/core';
import * as Java from '../ast/index.js';
import {JavaAstRootNode} from '../ast/index.js';
import {JavaOptions} from '../options/index.js';
import {JavaUtil} from '../util/index.js';
import {JavaAstUtils} from './JavaAstUtils.js';
import {BaseJavaAstTransformer} from './BaseJavaAstTransformer.js';

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

    if (property.type.kind == OmniTypeKind.PRIMITIVE && property.type.primitiveKind == OmniPrimitiveKind.NULL) {

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

    // if (property.type.kind == OmniTypeKind.PRIMITIVE && property.type.value) {
    //   this.addPrimitiveConstantField(property, property.type, body, commentList);
    //   return;
    // }

    const fieldType = JavaAstUtils.createTypeNode(property.type);
    const fieldIdentifier = new Java.Identifier(property.fieldName || Case.camel(property.name), property.name);

    const field = new Java.Field(
      fieldType,
      fieldIdentifier,
      new Java.ModifierList(
        new Java.Modifier(Java.ModifierType.PRIVATE),
      ),
    );

    if (property.type.kind == OmniTypeKind.PRIMITIVE && property.type.value !== undefined) {
      if (options.immutableModels && property.type.valueMode == OmniPrimitiveValueMode.DEFAULT) {

        // If the model is immutable and the value given is just a default,
        // then it will have to be given through the constructor in the constructor transformer.

      } else {

        field.initializer = new Java.Literal(property.type.value, property.type.primitiveKind);
      }
    }

    field.property = property;
    field.comments = commentList;
    field.annotations = this.getGetterAnnotations(property);

    if (options.immutableModels) {
      field.modifiers.children.push(new Java.Modifier(Java.ModifierType.FINAL));
    }

    body.children.push(field);
  }

  private getCommentsList(property: OmniProperty, model: OmniModel, options: JavaOptions) {

    const comments: Java.FreeTextType[] = [];

    if (property.description && !this.hasComment(property.description, comments)) {

      // Sometimes a description can be set both to the property itself and its type.
      comments.push(new Java.FreeTextLine(property.description));
    }

    if (property.summary && !this.hasComment(property.summary, comments)) {
      comments.push(new Java.FreeTextLine(property.summary));
    }

    if (property.deprecated) {
      comments.push(new Java.FreeTextLine('@deprecated'));
    }

    if (property.required) {
      // TODO: Remove this, it should be apparent by the type of the property, no?
      comments.push(new Java.FreeTextLine('Required'));
    }

    if (property.type.kind != OmniTypeKind.OBJECT) {

      // If the type is not an object, then we will never create a class just for its sake.
      // So we should propagate all the examples and all other data we can find about it, to the property's comments.
      const typeComment = BaseJavaAstTransformer.getCommentsForType(property.type, model, options);

      if (typeComment) {
        comments.push(typeComment);
      }

      if (property.type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

        const staticArrayStrings = property.type.properties.map((prop, idx) => {
          const typeName = JavaUtil.getFullyQualifiedName(prop.type);
          const parameterName = prop.name;
          const description = prop.description || prop.type.description;
          return `[${idx}] ${typeName} ${parameterName}${(description ? ` - ${description}` : '')}`;
        });

        comments.push(new Java.FreeTextLine(`Array with parameters in this order:\n${staticArrayStrings.join('\n')}`));
      }
    }

    comments.push(...this.getLinkCommentsForProperty(property, model, options));

    return (comments.length > 0) ? new Java.CommentBlock(comments) : undefined;
  }

  private hasComment(needle: string, freeTexts: Java.FreeTextType[]): boolean {

    for (const freeText of freeTexts) {

      if (typeof freeText == 'string') {
        if (freeText == needle) {
          return true;
        }
      } else if (freeText instanceof Java.FreeText) {
        if (freeText.text == needle) {
          return true;
        }
      } else if ('child' in freeText) {

        if (this.hasComment(needle, [freeText.child])) {
          return true;
        }
      } else if (freeText instanceof Java.FreeTextSection) {
        if (this.hasComment(needle, [freeText.header])) {
          return true;
        }

        if (this.hasComment(needle, [freeText.content])) {
          return true;
        }
      }
    }

    return false;
  }

  private getLinkCommentsForProperty(property: OmniProperty, model: OmniModel, options: JavaOptions): Java.FreeTextType[] {

    const comments: Java.FreeTextType[] = [];

    if (!options.includeLinksOnProperty) {
      return comments;
    }

    const linkComments: Java.FreeTextType[] = [];
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

  private addPrimitiveConstantField(
    property: OmniProperty,
    type: OmniPrimitiveType,
    body: Java.Block,
    commentList?: Java.CommentBlock,
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

    if (type.value !== undefined) {

      // if (typeof type.value == 'function') {
      //   field.initializer = new Java.Literal(type.value(property.owner));
      // } else {
      field.initializer = new Java.Literal(type.value);
      // }
    }

    if (type.valueMode == OmniPrimitiveValueMode.LITERAL) {

      field.comments = commentList;
      body.children.push(field);
      return;
    }

    // TODO: Some of this should very likely be moved to another transformer! Since these are NOT only fields!

    const methodDeclarationReturnType = type.value && JavaUtil.isNullable(type)
      ? JavaAstUtils.createTypeNode(JavaUtil.toUnboxedPrimitiveType(type))
      : JavaAstUtils.createTypeNode(type);

    const methodDeclarationSignature = new Java.MethodDeclarationSignature(
      new Java.Identifier(JavaUtil.getGetterName(property.name, type), property.name),
      methodDeclarationReturnType,
      undefined,
      undefined,
      this.getGetterAnnotations(property),
    );

    // if (typeof type.value == 'function') {
    //
    //   // This constant is dynamic based on the type that the property is owned by.
    //   const methodDeclaration = new Java.MethodDeclaration(
    //     methodDeclarationSignature,
    //     new Java.Block(
    //       new Java.Statement(new Java.ReturnStatement(
    //         new Java.FieldReference(field),
    //       )),
    //     ),
    //   );
    //
    //   methodDeclaration.signature.comments = commentList;
    //   body.children.push(field);
    //   body.children.push(methodDeclaration);
    //
    // } else {

    let methodBlock: Java.Block;
    if (type.value) {
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
        new Java.Statement(new Java.ReturnStatement(new Java.Literal(type.value, type.primitiveKind))),
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
    // }
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
