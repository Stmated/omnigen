import {OmniType, OmniTypeKind, UnknownKind, VisitResult} from '@omnigen/core';
import {JACKSON_JSON_VALUE, JACKSON_OBJECT_MAPPER, JavaAndTargetOptions, JavaAstUtils} from '../transform';
import {SerializationLibrary} from '../options';
import {Case, OmniUtil} from '@omnigen/core-util';
import {JAVA_FEATURES, JavaUtil, JavaVisitor} from '..';
import {
  AbstractExpression,
  AbstractJavaNode,
  Annotation,
  AnnotationList,
  ArgumentList,
  BinaryExpression,
  Block,
  ClassReference,
  DeclarationReference,
  Field,
  FieldBackedGetter,
  FieldReference,
  GenericType,
  Identifier,
  IfStatement,
  JavaToken,
  Literal,
  MethodCall,
  MethodDeclaration,
  MethodDeclarationSignature,
  Modifier,
  ModifierList,
  ModifierType,
  Parameter,
  ParameterList,
  Predicate,
  RegularType,
  ReturnStatement,
  Statement,
  TokenType,
} from './JavaAstTypes.ts';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

export class RuntimeTypeMapping extends AbstractJavaNode {
  fields: Field[];
  getters: FieldBackedGetter[];
  methods: MethodDeclaration[];

  constructor(types: OmniType[], options: JavaAndTargetOptions) {
    super();

    this.fields = [];
    this.getters = [];
    this.methods = [];

    const fieldAnnotations = new AnnotationList();
    if (options.serializationLibrary == SerializationLibrary.JACKSON) {
      fieldAnnotations.children.push(new Annotation(
        new RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_VALUE}),
      ));
    }

    const untypedFieldType = {
      kind: OmniTypeKind.UNKNOWN,
    };

    const untypedField = new Field(
      new RegularType(untypedFieldType),
      new Identifier('_raw', 'raw'),
      new ModifierList(
        new Modifier(ModifierType.PRIVATE),
        new Modifier(ModifierType.FINAL),
      ),
      undefined,
      fieldAnnotations,
    );
    const untypedGetter = new FieldBackedGetter(
      untypedField,
    );

    this.fields.push(untypedField);
    this.getters.push(untypedGetter);

    const handled: OmniType[] = [];

    for (const type of types) {

      const otherType = handled.find(it => !OmniUtil.isDifferent(it, type, JAVA_FEATURES));
      if (otherType) {

        logger.debug(`Skipping runtime-mapped '${OmniUtil.describe(type)}' because '${OmniUtil.describe(otherType)}' already exists`);
        continue;
      }

      handled.push(type);

      const typedFieldName = this.getFieldName(type);

      const typedField = new Field(
        JavaAstUtils.createTypeNode(type),
        new Identifier(`_${typedFieldName}`),
      );
      const typedFieldReference = new FieldReference(typedField);

      const parameterList = new ParameterList();
      let conversionExpression: AbstractExpression;
      if (options.unknownType == UnknownKind.MUTABLE_OBJECT) {

        if (options.serializationLibrary == SerializationLibrary.JACKSON) {

          const objectMapperReference = new Identifier('objectMapper');
          const objectMapperDeclaration = new Parameter(
            new RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_OBJECT_MAPPER}),
            objectMapperReference,
          );

          parameterList.children.push(objectMapperDeclaration);
          conversionExpression = new MethodCall(
            new DeclarationReference(objectMapperDeclaration),
            new Identifier('convertValue'),
            new ArgumentList(
              new FieldReference(untypedField),
              new ClassReference(typedField.type),
            ),
          );
        } else {

          const transformerIdentifier = new Identifier('transformer');
          const targetClass = new GenericType(
            new RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'java.util.Function'}),
            [
              JavaAstUtils.createTypeNode(JavaUtil.getGenericCompatibleType(untypedFieldType)),
              JavaAstUtils.createTypeNode(JavaUtil.getGenericCompatibleType(typedField.type.omniType)),
            ],
          );

          const transformerParameter = new Parameter(targetClass, transformerIdentifier);

          parameterList.children.push(transformerParameter);
          conversionExpression = new MethodCall(
            new DeclarationReference(transformerParameter),
            new Identifier('apply'),
            new ArgumentList(
              new FieldReference(untypedField),
            ),
          );
        }

      } else {
        conversionExpression = new Literal('Conversion path unknown');
      }

      const typedGetter = new MethodDeclaration(
        new MethodDeclarationSignature(
          new Identifier(JavaUtil.getGetterName(typedFieldName, typedField.type.omniType)),
          typedField.type,
          parameterList,
        ),
        new Block(
          // First check if we have already cached the result.
          new IfStatement(
            new Predicate(
              typedFieldReference,
              TokenType.NOT_EQUALS,
              new Literal(null),
            ),
            new Block(
              new Statement(
                new ReturnStatement(
                  typedFieldReference,
                ),
              ),
            ),
          ),
          // If not, then try to convert the raw value into the target type and cache it.
          new Statement(
            new ReturnStatement(
              new BinaryExpression(
                typedFieldReference,
                new JavaToken(TokenType.ASSIGN),
                conversionExpression,
              ),
            ),
          ),
        ),
      );

      this.fields.push(typedField);
      this.methods.push(typedGetter);
    }
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return visitor.visitRuntimeTypeMapping(this, visitor);
  }

  private getFieldName(type: OmniType): string {

    // if (type.kind == OmniTypeKind.PRIMITIVE) {
    //
    //   // If it is a primitive, we do not care about the 'name' of the type.
    //   // We only care about what it actually is.
    //   // This is a preference, but might be wrong. Maybe make it an option?
    //   return camelCase(JavaUtil.getPrimitiveKindName(type.primitiveKind, true));
    // }

    // TODO: This is most likely wrong, will give name with package and whatnot.
    const javaName = JavaUtil.getName({
      type: type,
    });

    return Case.camel(javaName);
  }
}
