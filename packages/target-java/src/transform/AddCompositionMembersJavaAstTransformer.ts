import {AbstractJavaAstTransformer, JavaAndTargetOptions, JavaAstTransformerArgs} from './AbstractJavaAstTransformer';
import {
  AstNodeWithChildren,
  OmniCompositionType,
  OmniEnumType,
  OmniIntersectionType,
  OmniModel,
  OmniPrimitiveKinds,
  OmniPrimitiveType,
  OmniType,
  OmniTypeKind,
  OmniUnknownType,
  RootAstNode,
  TargetFeatures,
  TypeNode,
  UnknownKind,
} from '@omnigen/core';
import {JavaUtil} from '../util';
import * as Java from '../ast';
import {
  AbstractJavaExpression,
  AbstractObjectDeclaration,
  Annotation,
  AnnotationList,
  ArgumentList,
  BinaryExpression,
  Block,
  ClassName,
  ClassReference,
  DeclarationReference,
  EdgeType,
  Field,
  FieldBackedGetter,
  Identifier,
  IfStatement,
  JavaAstRootNode,
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
  ReturnStatement,
  Statement,
  TokenKind,
} from '../ast';
import {Case, Naming, OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
import {JavaAstUtils} from './JavaAstUtils';
import {JavaOptions, SerializationLibrary} from '../options';
import {JACKSON_JSON_CREATOR, JACKSON_JSON_VALUE, JACKSON_OBJECT_MAPPER} from './JacksonJavaAstTransformer';
import {JAVA_FEATURES} from '../index.ts';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

type TypedPair = { field: Field, method: MethodDeclaration };

/**
 * There needs to be more centralized handling of adding fields to a class depending on if it is extending or implementing interfaces.
 */
export class AddCompositionMembersJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitClassDeclaration: (node, visitor) => {

        const omniType = node.type.omniType;

        if (omniType.kind == OmniTypeKind.EXCLUSIVE_UNION) {
          this.addXOrMappingToBody(args.root, omniType, node, args.options, args.features);
        } else if (omniType.kind == OmniTypeKind.INTERSECTION) {
          this.addAndCompositionToClassDeclaration(args.model, args.root, omniType, node, args.options);
        }

        // Then keep searching deeper, into nested types
        defaultVisitor.visitClassDeclaration(node, visitor);
      },
    }));
  }

  /**
   * This is quite wrong, since it is not for certain that one type should be a class and another an interface.
   * This needs to be handled in some other way which orders and/or categorizes the extensions.
   */
  private addAndCompositionToClassDeclaration(model: OmniModel, root: JavaAstRootNode, andType: OmniIntersectionType, classDec: Java.ClassDeclaration, options: JavaAndTargetOptions): void {

    const implementsDeclarations = new Java.ImplementsDeclaration(
      new Java.TypeList([]),
    );

    for (const type of andType.types) {

      if (type.kind === OmniTypeKind.INTERSECTION) {

        // We can continue deeper, and add fields for this composition as well.

      } else {

        if (JavaUtil.asSuperType(type)) {

          if (!classDec.extends) {
            classDec.extends = new Java.ExtendsDeclaration(new Java.TypeList([root.getAstUtils().createTypeNode(type)]));
          } else {

            if (type.kind === OmniTypeKind.OBJECT) {
              const interfaceType = JavaAstUtils.addInterfaceOf(type, root, options);
              implementsDeclarations.types.children.push(root.getAstUtils().createTypeNode(interfaceType));
            } else if (type.kind === OmniTypeKind.INTERFACE) {
              implementsDeclarations.types.children.push(root.getAstUtils().createTypeNode(type));
            }

            for (const property of OmniUtil.getPropertiesOf(type)) {
              JavaAstUtils.addOmniPropertyToBlockAsField({
                root, property, body: classDec.body, options,
              });
            }
          }

        } else {
          throw new Error(`Need to implement the addition of members of '${OmniUtil.describe(type)}'`);
        }
      }
    }

    if (implementsDeclarations.types.children.length > 0) {
      classDec.implements = implementsDeclarations;
    }
  }

  private addXOrMappingToBody(
    root: RootAstNode,
    type: OmniCompositionType<OmniType | OmniPrimitiveType>,
    declaration: AbstractObjectDeclaration,
    options: JavaAndTargetOptions,
    features: TargetFeatures,
  ): void {

    // The composition type is XOR, it can only be one of them.
    // That is not possible to represent in Java, so we need another way of representing it.
    // Order of importance is:
    // 1. Using discriminator.propertyName and mapping (By Json fasterxml subtypes)
    // 2. Using discriminator.propertyName and schema ref name (if mapping does not exist) (By Json fasterxml subtypes)
    // 3. Trial and error by saving content as a string, and then trying different options (in a sorted order of hopeful exclusivity)

    // TODO: If it is a composition of multiple ENUM, then we need to simplify and merge them
    const enumTypes: OmniEnumType[] = [];
    const primitiveTypes: OmniPrimitiveType[] = [];
    let otherTypeCount = 0;
    for (const xor of type.types) {
      if (xor.kind == OmniTypeKind.ENUM) {
        enumTypes.push(xor);
      } else if (OmniUtil.isPrimitive(xor)) {
        primitiveTypes.push(xor);
      } else {
        otherTypeCount++;
      }
    }

    if (enumTypes.length > 0 && primitiveTypes.length > 0 && otherTypeCount == 0) {
      this.addEnumAndPrimitivesAsObjectEnum(root, enumTypes, primitiveTypes, declaration, options);
    } else {

      // This means the specification did not have any discriminators.
      // Instead we need to figure out what it is in runtime.
      this.addRuntimeMapping(root, declaration.body, type.types, options, features);
    }
  }

  private addRuntimeMapping(
    root: RootAstNode,
    target: AstNodeWithChildren,
    types: OmniType[],
    options: JavaAndTargetOptions,
    features: TargetFeatures,
  ) {

    const fieldAnnotations = new AnnotationList();
    if (options.serializationLibrary === SerializationLibrary.JACKSON) {
      fieldAnnotations.children.push(new Annotation(
        new EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_VALUE}),
      ));
    }

    const untypedFieldType: OmniUnknownType = {
      kind: OmniTypeKind.UNKNOWN,
      unknownKind: UnknownKind.ANY,
    };

    const untypedField = new Field(
      root.getAstUtils().createTypeNode(untypedFieldType),
      new Identifier('_raw', 'raw'),
      new ModifierList(new Modifier(ModifierType.PRIVATE), new Modifier(ModifierType.FINAL)),
      undefined,
      fieldAnnotations,
    );
    const untypedGetter = new FieldBackedGetter(
      new Java.FieldReference(untypedField),
    );

    target.children.push(untypedField);
    target.children.push(untypedGetter);

    const handled: OmniType[] = [];

    for (const type of types) {

      const otherType = handled.find(it => !OmniUtil.isDifferent(it, type, JAVA_FEATURES));
      if (otherType) {

        logger.debug(`Skipping runtime-mapped '${OmniUtil.describe(type)}' because '${OmniUtil.describe(otherType)}' already exists`);
        continue;
      }

      handled.push(type);

      const pair = this.createdTypedPair(root, untypedField, type, options, features);

      target.children.push(pair.field);
      target.children.push(pair.method);
    }
  }

  private addEnumAndPrimitivesAsObjectEnum(
    root: RootAstNode,
    enumTypes: OmniEnumType[],
    primitiveTypes: OmniPrimitiveType[],
    declaration: Java.AbstractObjectDeclaration,
    options: JavaOptions,
  ): void {

    // Java does not support advanced enums. We need to handle it some other way.
    // There are two different solutions that I can see:
    // 1. @JsonValue and a string field and a getter which converts to the Enum, and another getter for unknown values
    // 2. Convert the enum into an object with public static final fields which represent the enum values

    const primitiveKinds = new Set<OmniPrimitiveKinds>();

    const singletonFactoryMethodIdentifier = new Java.Identifier('get');
    const knownValueFields: Java.Field[] = [];

    const checkMethods: Java.MethodDeclaration[] = [];

    const fieldValueIdentifier = new Java.Identifier(`_value`);
    const fieldValueType = new Java.EdgeType({
      kind: OmniTypeKind.UNKNOWN,
      unknownKind: UnknownKind.OBJECT,
    });

    const fieldAnnotations = new Java.AnnotationList();
    if (options.serializationLibrary == SerializationLibrary.JACKSON) {
      fieldAnnotations.children.push(new Java.Annotation(
        // TODO: Too specific to fasterxml, should be moved somewhere else/use a generalized annotation type
        new Java.EdgeType({
          kind: OmniTypeKind.HARDCODED_REFERENCE,
          fqn: JACKSON_JSON_VALUE,
        }),
      ));
    }

    const fieldValue = new Java.Field(
      fieldValueType,
      fieldValueIdentifier,
      new Java.ModifierList(
        new Java.Modifier(Java.ModifierType.PRIVATE),
        new Java.Modifier(Java.ModifierType.FINAL),
      ),
      undefined,
      fieldAnnotations,
    );

    for (const enumType of enumTypes) {
      primitiveKinds.add(enumType.itemKind);
      if (!enumType.enumConstants) {

        // If we have no enum constants, we can't really do much, since we do not know any values.
        continue;
      }

      const knownEnumFields: Java.Field[] = [];
      for (const enumValue of enumType.enumConstants) {

        // TODO: Instead use a constructor and each field should be a singleton instance
        const fieldIdentifier = new Java.Identifier(Case.constant(String(enumValue)));

        const field = new Java.Field(
          declaration.type,
          fieldIdentifier,
          new Java.ModifierList(
            new Java.Modifier(Java.ModifierType.PUBLIC),
            new Java.Modifier(Java.ModifierType.STATIC),
            new Java.Modifier(Java.ModifierType.FINAL),
          ),
          new Java.MethodCall(
            new Java.MemberAccess(new Java.ClassName(declaration.type), singletonFactoryMethodIdentifier),
            new Java.ArgumentList(
              // TODO: Somehow in the future reference the Enum item instead of the string value
              new Java.Literal(enumValue, enumType.itemKind),
            ),
          ),
        );

        knownEnumFields.push(field);
        declaration.body.children.push(field);
      }

      const knownBinary = this.createSelfIfOneOfStaticFieldsBinary(knownEnumFields, declaration.type);
      if (knownBinary) {

        const enumTypeName = Case.pascal(Naming.unwrap(enumType.name));
        checkMethods.push(new Java.MethodDeclaration(
          new Java.MethodDeclarationSignature(
            new Java.Identifier(`is${enumTypeName}`),
            root.getAstUtils().createTypeNode({kind: OmniTypeKind.BOOL}),
          ),
          new Java.Block(
            new Java.Statement(
              new Java.ReturnStatement(knownBinary),
            ),
          ),
        ));

        // TODO: In the future, somehow make this cast value into Tag directly, without runtime lookup.
        checkMethods.push(new Java.MethodDeclaration(
          new Java.MethodDeclarationSignature(
            new Java.Identifier(`getAs${enumTypeName}`),
            root.getAstUtils().createTypeNode(enumType),
          ),
          new Java.Block(
            new Java.Statement(
              new Java.ReturnStatement(
                new Java.MethodCall(
                  // NOTE: Is it really all right creating a new Java.Type here? Should we not used the *REAL* target?
                  //        Since it might be in a separate package based on specific language needs
                  new Java.MemberAccess(new Java.ClassName(root.getAstUtils().createTypeNode(enumType)), new Java.Identifier('valueOf')),
                  new Java.ArgumentList(
                    new Java.Cast(
                      root.getAstUtils().createTypeNode({kind: enumType.itemKind}),
                      new Java.FieldReference(fieldValue),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ));
      }

      knownValueFields.push(...knownEnumFields);
    }

    for (const primitiveType of primitiveTypes) {

      if (!primitiveType.value) {

        // We have no idea what the value is supposed to contain.
        // So there is not really much we can do here. It will be up to the user to check the "isKnown()" method.
        continue;
      }

      // This primitive type has a value constant, so we can treat it as a known value, like an ENUM.
      let fieldIdentifier: Java.Identifier;
      const valueConstant = primitiveType.value;

      if (typeof valueConstant == 'string') {
        fieldIdentifier = new Java.Identifier(JavaUtil.getSafeIdentifierName(Case.constant(valueConstant)));
      } else {
        fieldIdentifier = new Java.Identifier(Case.constant(String(valueConstant)));
      }

      const field = new Java.Field(
        declaration.type,
        fieldIdentifier,
        new Java.ModifierList(
          new Java.Modifier(Java.ModifierType.PUBLIC),
          new Java.Modifier(Java.ModifierType.STATIC),
          new Java.Modifier(Java.ModifierType.FINAL),
        ),
        new Java.MethodCall(
          new Java.MemberAccess(new Java.ClassName(declaration.type), singletonFactoryMethodIdentifier),
          new Java.ArgumentList(
            new Java.Literal(valueConstant, primitiveType.kind),
          ),
        ),
      );

      knownValueFields.push(field);
      declaration.body.children.push(field);
    }

    const dictionaryIdentifier = new Java.Identifier(`_values`);
    const fieldValuesType: OmniType = {
      kind: OmniTypeKind.DICTIONARY,
      keyType: fieldValueType.omniType,
      valueType: declaration.type.omniType,
    };

    const fieldValues = new Java.Field(
      root.getAstUtils().createTypeNode(fieldValuesType, false),
      dictionaryIdentifier,
      new Java.ModifierList(
        new Java.Modifier(Java.ModifierType.PRIVATE),
        new Java.Modifier(Java.ModifierType.STATIC),
        new Java.Modifier(Java.ModifierType.FINAL),
      ),
      new Java.NewStatement(root.getAstUtils().createTypeNode(fieldValuesType, true)),
    );
    declaration.body.children.push(fieldValues);

    const fieldValuesStaticTarget = new Java.StaticMemberReference(
      new Java.ClassName(declaration.type),
      fieldValues.identifier,
    );

    const singletonFactoryParamIdentifier = new Java.Identifier('value');
    const createdIdentifier = new Java.Identifier('created');

    const singletonFactoryDeclaration = new Java.Parameter(
      fieldValueType,
      singletonFactoryParamIdentifier,
    );

    const createdVariableDeclaration = new Java.VariableDeclaration(
      createdIdentifier,
      new Java.NewStatement(
        declaration.type,
        new Java.ArgumentList(
          new Java.DeclarationReference(singletonFactoryDeclaration),
        ),
      ),
      undefined,
      true,
    );

    const singletonMethodAnnotations = new Java.AnnotationList();
    if (options.serializationLibrary === SerializationLibrary.JACKSON) {

      singletonMethodAnnotations.children.push(new Java.Annotation(
        // TODO: Too specific to fasterxml, should be moved somewhere else/use a generalized annotation type
        new Java.EdgeType({
          kind: OmniTypeKind.HARDCODED_REFERENCE,
          fqn: JACKSON_JSON_CREATOR,
        }),
      ));
    }

    const singletonFactory = new Java.MethodDeclaration(
      new Java.MethodDeclarationSignature(
        singletonFactoryMethodIdentifier,
        declaration.type,
        new Java.ParameterList(singletonFactoryDeclaration),
        new Java.ModifierList(
          new Java.Modifier(Java.ModifierType.PUBLIC),
          new Java.Modifier(Java.ModifierType.STATIC),
        ),
        singletonMethodAnnotations,
      ),
      new Java.Block(
        new Java.IfElseStatement(
          [
            new Java.IfStatement(
              new Java.BinaryExpression(
                new Java.MethodCall(
                  new Java.MemberAccess(fieldValuesStaticTarget, new Java.Identifier('containsKey')),
                  new Java.ArgumentList(
                    new Java.DeclarationReference(singletonFactoryDeclaration),
                  ),
                ),
                new Java.JavaToken(Java.TokenKind.EQUALS),
                new Java.Literal(true),
              ),
              new Java.Block(
                new Java.Statement(
                  new Java.ReturnStatement(
                    new Java.MethodCall(
                      new Java.MemberAccess(fieldValuesStaticTarget, new Java.Identifier('get')),
                      new Java.ArgumentList(
                        new Java.DeclarationReference(singletonFactoryDeclaration),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
          new Java.Block(
            new Java.Statement(createdVariableDeclaration),
            new Java.Statement(
              new Java.MethodCall(
                new Java.MemberAccess(fieldValuesStaticTarget, new Java.Identifier('set')),
                new Java.ArgumentList(
                  new Java.DeclarationReference(singletonFactoryDeclaration),
                  new Java.DeclarationReference(createdVariableDeclaration),
                ),
              ),
            ),
            new Java.Statement(
              new Java.ReturnStatement(
                new Java.DeclarationReference(createdVariableDeclaration),
              ),
            ),
          ),
        ),
      ),
    );

    declaration.body.children.push(singletonFactory);
    declaration.body.children.push(fieldValue);
    declaration.body.children.push(
      new Java.FieldBackedGetter(
        new Java.FieldReference(fieldValue),
      ),
    );

    this.addSelfIfOfOneOfStaticFieldsMethod(root, knownValueFields, declaration);

    // Add any check methods that we have created.
    declaration.body.children.push(...checkMethods);

    // NOTE: This might be better to handle so we have one constructor per known primitive kind.
    // for (const primitiveKind of primitiveKinds) {
    // const typeName = JavaUtil.getPrimitiveKindName(primitiveKind, false);

    const parameterIdentifier = new Java.Identifier('value');
    const constructorParameter = new Java.ConstructorParameter(
      new Java.FieldReference(fieldValue),
      fieldValueType,
      parameterIdentifier,
    );

    declaration.body.children.push(
      new Java.ConstructorDeclaration(
        new Java.ConstructorParameterList(constructorParameter),
        new Java.Block(
          new Java.Statement(
            new Java.AssignExpression(
              new Java.FieldReference(fieldValue),
              new Java.DeclarationReference(constructorParameter),
            ),
          ),
        ),
        // Private constructor, since all creation should go through the singleton method.
        new Java.ModifierList(
          new Java.Modifier(Java.ModifierType.PRIVATE),
        ),
      ),
    );
  }

  private addSelfIfOfOneOfStaticFieldsMethod(
    root: RootAstNode,
    knownValueFields: Java.Field[],
    declaration: Java.AbstractObjectDeclaration,
  ): void {

    const knownBinary = this.createSelfIfOneOfStaticFieldsBinary(knownValueFields, declaration.type);
    if (knownBinary) {
      declaration.body.children.push(
        new Java.MethodDeclaration(
          new Java.MethodDeclarationSignature(
            new Java.Identifier('isKnown'),
            root.getAstUtils().createTypeNode({
              kind: OmniTypeKind.BOOL,
              nullable: false,
            }),
          ),
          new Java.Block(
            new Java.Statement(
              new Java.ReturnStatement(knownBinary),
            ),
          ),
        ),
      );
    }
  }

  private createSelfIfOneOfStaticFieldsBinary(
    knownValueFields: Java.Field[],
    selfType: TypeNode,
  ): Java.BinaryExpression | undefined {

    let knownBinary: Java.BinaryExpression | undefined = undefined;
    for (const element of knownValueFields) {

      const binaryExpression = new Java.BinaryExpression(
        new Java.SelfReference(),
        new Java.JavaToken(Java.TokenKind.EQUALS),
        new Java.StaticMemberReference(
          new Java.ClassName(selfType),
          element.identifier,
        ),
      );

      if (knownBinary) {
        knownBinary = new Java.BinaryExpression(knownBinary, new Java.JavaToken(Java.TokenKind.OR), binaryExpression);
      } else {
        knownBinary = binaryExpression;
      }
    }

    return knownBinary;
  }

  private getFieldName(type: OmniType): string {

    // TODO: This is most likely wrong, will give name with package and whatnot.
    const javaName = JavaUtil.getName({
      type: type,
    });

    return Case.camel(javaName);
  }

  private createdTypedPair(root: RootAstNode, untypedField: Field, type: OmniType, options: JavaAndTargetOptions, features: TargetFeatures): TypedPair {

    const typedFieldName = this.getFieldName(type);

    const typedField = new Field(root.getAstUtils().createTypeNode(type), new Identifier(`_${typedFieldName}`));
    const typedFieldReference = new Java.FieldReference(typedField);

    const parameterList = new ParameterList();
    let conversionExpression: AbstractJavaExpression;
    if (options.unknownType == UnknownKind.MUTABLE_OBJECT || options.unknownType == UnknownKind.ANY) {

      if (options.serializationLibrary == SerializationLibrary.JACKSON) {
        conversionExpression = this.modifyGetterForJackson(untypedField, typedField, parameterList);
      } else {
        conversionExpression = this.modifyGetterForPojo(root, untypedField, typedField, parameterList, features);
      }

    } else {
      conversionExpression = new Literal('Conversion path unknown');
    }

    const typedGetter = new MethodDeclaration(
      new MethodDeclarationSignature(
        new Identifier(`get${Case.pascal(typedField.identifier.value)}`),
        typedField.type,
        parameterList,
      ),
      new Block(
        // First check if we have already cached the result.
        new IfStatement(
          new Predicate(typedFieldReference, TokenKind.NOT_EQUALS, new Literal(null)),
          new Block(new Statement(new ReturnStatement(typedFieldReference))),
        ),
        // If not, then try to convert the raw value into the target type and cache it.
        new Statement(new ReturnStatement(
          new BinaryExpression(typedFieldReference, new JavaToken(TokenKind.ASSIGN), conversionExpression),
        )),
      ),
    );

    return {
      field: typedField,
      method: typedGetter,
    };
  }

  private modifyGetterForJackson(untypedField: Field, typedField: Field, parameterList: ParameterList): AbstractJavaExpression {

    const objectMapperReference = new Identifier('objectMapper');
    const objectMapperDeclaration = new Parameter(
      new EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_OBJECT_MAPPER}),
      objectMapperReference,
    );

    parameterList.children.push(objectMapperDeclaration);
    return new MethodCall(
      new Java.MemberAccess(new DeclarationReference(objectMapperDeclaration), new Identifier('convertValue')),
      new ArgumentList(
        new Java.FieldReference(untypedField),
        new ClassReference(new ClassName(typedField.type)),
      ),
    );
  }

  private modifyGetterForPojo(
    root: RootAstNode,
    untypedField: Field,
    typedField: Field,
    parameterList: ParameterList,
    features: TargetFeatures,
  ): AbstractJavaExpression {

    const transformerIdentifier = new Identifier('transformer');

    const delegateNode = new Java.Delegate(
      [untypedField.type],
      typedField.type,
    );

    const transformerParameter = new Parameter(delegateNode, transformerIdentifier);
    parameterList.children.push(transformerParameter);

    return new Java.DelegateCall(
      new DeclarationReference(transformerParameter),
      new Java.GenericRef(delegateNode),
      new ArgumentList(
        new Java.FieldReference(untypedField),
      ),
    );
  }


}
