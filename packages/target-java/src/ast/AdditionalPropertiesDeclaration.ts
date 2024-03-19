import {OmniDictionaryType, OmniPrimitiveKind, OmniPrimitiveType, OmniTypeKind, OmniUnknownType, Reducer, ReducerResult, VisitResult} from '@omnigen/core';
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

  // readonly adderMethod: MethodDeclaration;
  // readonly keyType: OmniPrimitiveType;
  // readonly valueType: OmniUnknownType;
  // readonly mapType: OmniDictionaryType;

  constructor(options: JavaOptions | AbstractJavaNode[]) {
    super();

    if (Array.isArray(options)) {

      this.children = options;
      return;
    }

    // TODO: This should be some other type. Point directly to Map<String, Object>? Or have specific known type?
    const keyType: OmniPrimitiveType = {
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: OmniPrimitiveKind.STRING,
    };

    // TODO: Should this be "Unknown" or another type that is "Any"?
    //  Difference between rendering as JsonNode and Object in some cases.
    const valueType: OmniUnknownType = {
      kind: OmniTypeKind.UNKNOWN,
    };
    const mapType: OmniDictionaryType = {
      kind: OmniTypeKind.DICTIONARY,
      keyType: keyType,
      valueType: valueType,
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
      JavaAstUtils.createTypeNode(mapType, false),
      additionalPropertiesFieldIdentifier,
      new ModifierList(
        new Modifier(ModifierType.PRIVATE),
        new Modifier(ModifierType.FINAL),
      ),
      new NewStatement(JavaAstUtils.createTypeNode(mapType, true)),
      fieldAnnotations,
    );

    const keyParameterDeclaration = new Parameter(JavaAstUtils.createTypeNode(keyType), keyParameterIdentifier);
    const valueParameterDeclaration = new Parameter(JavaAstUtils.createTypeNode(valueType), valueParameterIdentifier);

    const adderMethod = new MethodDeclaration(
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

    adderMethod.signature.annotations = new AnnotationList();

    if (options.serializationLibrary == SerializationLibrary.JACKSON) {
      adderMethod.signature.annotations.children.push(new Annotation(
        new RegularType({
          kind: OmniTypeKind.HARDCODED_REFERENCE,
          fqn: JACKSON_JSON_ANY_SETTER,
        }),
      ));
    }

    this.children = [
      additionalPropertiesField,
      adderMethod,
    ];
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitAdditionalPropertiesDeclaration(this, visitor);
  }

  reduce(visitor: Reducer<JavaVisitor<unknown>>): ReducerResult<AdditionalPropertiesDeclaration> {
    return visitor.reduceAdditionalPropertiesDeclaration(this, visitor);
  }
}
