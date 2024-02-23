import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.js';
import {
  OmniPrimitiveKind,
  OmniProperty, OmniType,
  OmniTypeKind,
} from '@omnigen/core';
import * as Java from '../ast/index.js';
import {JavaOptions} from '../options/index.js';
import {JavaUtil} from '../util/index.js';
import {JavaAstUtils} from './JavaAstUtils.js';
import {Case, OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';

export class AddFieldsAstTransformer extends AbstractJavaAstTransformer {
  transformAst(args: JavaAstTransformerArgs): void {

    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitClassDeclaration: (node, visitor) => {

        // Let's add all the fields that belong to this object.
        // It is up to other transformers to later add getters/setters or lombok (Java) or whatever language-specific.

        const type = node.type.omniType;
        const body = node.body;

        if (type.kind == OmniTypeKind.OBJECT) {

          for (const property of type.properties) {
            this.addOmniPropertyToBody(body, property, args.options);
          }

          if (type.additionalProperties) {

            if (!JavaUtil.superMatches(args.model, type, parent => this.hasAdditionalProperties(parent))) {

              // No parent implements additional properties, so we should.
              body.children.push(new Java.AdditionalPropertiesDeclaration());
            }
          }
        }

        for (const property of JavaUtil.collectUnimplementedPropertiesFromInterfaces(type)) {
          this.addOmniPropertyToBody(body, property, args.options);
        }

        // Then keep searching deeper, into nested types
        AbstractJavaAstTransformer.JAVA_VISITOR.visitClassDeclaration(node, visitor);
      },
    }));
  }

  private hasAdditionalProperties(parent: OmniType): boolean {
    return parent.kind == OmniTypeKind.OBJECT && parent.additionalProperties == true;
  }

  private addOmniPropertyToBody(body: Java.Block, property: OmniProperty, options: JavaOptions): void {

    if (OmniUtil.isNull(property.type) && !options.includeAlwaysNullProperties) {
      return;
    }

    if (property.abstract) {

      // If the property is abstract, then we should not be adding a field for it.
      // Instead it will be added by another transformer that deals with the getters and setters.
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

    if (property.type.kind == OmniTypeKind.PRIMITIVE) {
      if (property.type.primitiveKind == OmniPrimitiveKind.NULL) {
        field.initializer = new Java.Literal(property.type.value ?? null, property.type.primitiveKind);
      } else if (property.type.value !== undefined) {
        if (options.immutableModels && !property.type.literal) {

          // If the model is immutable and the value given is just a default,
          // then it will have to be given through the constructor in the constructor transformer.

        } else {

          field.initializer = new Java.Literal(property.type.value, property.type.primitiveKind);
        }
      }
    }

    field.property = property;
    field.annotations = this.getGetterAnnotations(property);

    if (options.immutableModels || OmniUtil.isNull(property.type)) {
      field.modifiers.children.push(new Java.Modifier(Java.ModifierType.FINAL));
    }

    body.children.push(field);
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