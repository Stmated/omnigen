import {OmniDictionaryType, OmniPrimitiveKind, OmniPrimitiveType, OmniTypeKind, OmniUnknownType, VisitResult} from '@omnigen/core';
import {JavaOptions, SerializationLibrary} from '../options';
import {JACKSON_JSON_ANY_GETTER, JACKSON_JSON_ANY_SETTER, JavaAstUtils} from '../transform';
import {JavaVisitor} from '../visit';
import {
  AbstractJavaNode,
  Annotation,
  AnnotationList,
  ArgumentList,
  Block,
  DeclarationReference,
  Field,
  FieldReference,
  Identifier,
  MethodCall,
  MethodDeclaration,
  MethodDeclarationSignature,
  Modifier,
  ModifierList,
  ModifierType,
  NewStatement,
  Parameter,
  ParameterList,
  RegularType,
  Statement,
} from './JavaAstTypes.ts';

export class AdditionalPropertiesDeclaration extends AbstractJavaNode {
  children: AbstractJavaNode[];

  readonly adderMethod: MethodDeclaration;
  readonly keyType: OmniPrimitiveType;
  readonly valueType: OmniUnknownType;
  readonly mapType: OmniDictionaryType;

  constructor(options: JavaOptions) {
    super();

    // TODO: This should be some other type. Point directly to Map<String, Object>? Or have specific known type?
    this.keyType = {
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.STRING,
    };

    // TODO: Should this be "Unknown" or another type that is "Any"?
    //  Difference between rendering as JsonNode and Object in some cases.
    this.valueType = {
      kind: OmniTypeKind.UNKNOWN,
    };
    this.mapType = {
      kind: OmniTypeKind.DICTIONARY,
      keyType: this.keyType,
      valueType: this.valueType,
    };

    const additionalPropertiesFieldIdentifier = new Identifier('_additionalProperties');
    const keyParameterIdentifier = new Identifier('key');
    const valueParameterIdentifier = new Identifier('value');

    const fieldAnnotations = new AnnotationList();

    if (options.serializationLibrary == SerializationLibrary.JACKSON) {

      // NOTE: This should NEVER be on a field. But it should be moved by later transformers!
      fieldAnnotations.children.push(new Annotation(
        new RegularType({
          kind: OmniTypeKind.HARDCODED_REFERENCE,
          fqn: JACKSON_JSON_ANY_GETTER,
        }),
      ));
    }

    const additionalPropertiesField = new Field(
      JavaAstUtils.createTypeNode(this.mapType, false),
      additionalPropertiesFieldIdentifier,
      new ModifierList(
        new Modifier(ModifierType.PRIVATE),
        new Modifier(ModifierType.FINAL),
      ),
      new NewStatement(JavaAstUtils.createTypeNode(this.mapType, true)),
      fieldAnnotations,
    );

    const keyParameterDeclaration = new Parameter(JavaAstUtils.createTypeNode(this.keyType), keyParameterIdentifier);
    const valueParameterDeclaration = new Parameter(JavaAstUtils.createTypeNode(this.valueType), valueParameterIdentifier);

    this.adderMethod = new MethodDeclaration(
      new MethodDeclarationSignature(
        new Identifier('addAdditionalProperty'),
        JavaAstUtils.createTypeNode(<OmniPrimitiveType>{
          kind: OmniTypeKind.PRIMITIVE,
          primitiveKind: OmniPrimitiveKind.VOID,
        }),
        new ParameterList(
          keyParameterDeclaration,
          valueParameterDeclaration,
        ),
      ),
      new Block(
        new Statement(
          new MethodCall(
            new FieldReference(additionalPropertiesField),
            new Identifier('put'),
            new ArgumentList(
              new DeclarationReference(keyParameterDeclaration),
              new DeclarationReference(valueParameterDeclaration),
            ),
          ),
        ),
      ),
    );

    this.adderMethod.signature.annotations = new AnnotationList();

    if (options.serializationLibrary == SerializationLibrary.JACKSON) {
      this.adderMethod.signature.annotations.children.push(new Annotation(
        new RegularType({
          kind: OmniTypeKind.HARDCODED_REFERENCE,
          fqn: JACKSON_JSON_ANY_SETTER,
        }),
      ));
    }

    this.children = [
      additionalPropertiesField,
      this.adderMethod,
    ];
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitAdditionalPropertiesDeclaration(this, visitor);
  }
}
