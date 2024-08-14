import {
  AstNodeWithChildren,
  AstTransformer,
  AstTransformerArguments,
  OmniCompositionType,
  OmniEnumType,
  OmniIntersectionType,
  OmniPrimitiveKinds,
  OmniPrimitiveType,
  OmniType,
  OmniTypeKind,
  OmniUnknownType,
  PackageOptions,
  RootAstNode,
  TargetFeatures,
  TargetOptions,
  TypeNode,
  UnknownKind,
} from '@omnigen/api';
import {Case, Naming, OmniUtil, Visitor} from '@omnigen/core';
import {CodeAstUtils, CodeOptions, CodeUtil} from '../../';
import {LoggerFactory} from '@omnigen/core-log';
import {CodeRootAstNode} from '../CodeRootAstNode.ts';
import * as Code from '../Code';
import {DelegateKind, VirtualAnnotationKind} from '../Code';
import {AbstractCodeNode} from '../AbstractCodeNode.ts';

const logger = LoggerFactory.create(import.meta.url);

type TypedPair = { field: Code.Field, method: Code.MethodDeclaration };

/**
 * There needs to be more centralized handling of adding fields to a class depending on if it is extending or implementing interfaces.
 */
export class AddCompositionMembersCodeAstTransformer implements AstTransformer<CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions>): void {

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(Visitor.create(defaultVisitor, {

      visitClassDeclaration: (node, visitor) => {

        const omniType = node.type.omniType;

        if (omniType.kind == OmniTypeKind.EXCLUSIVE_UNION) {
          this.addXOrMappingToBody(args.root, omniType, node, args.options, args.features);
        } else if (omniType.kind == OmniTypeKind.INTERSECTION) {
          this.addAndCompositionToClassDeclaration(args.root, omniType, node, args.options);
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
  private addAndCompositionToClassDeclaration(
    root: CodeRootAstNode,
    andType: OmniIntersectionType,
    classDec: Code.ClassDeclaration,
    options: PackageOptions & TargetOptions & CodeOptions,
  ): void {

    const implementsDeclarations = new Code.ImplementsDeclaration(
      new Code.TypeList(),
    );

    for (const type of andType.types) {

      if (type.kind === OmniTypeKind.INTERSECTION) {

        // We can continue deeper, and add fields for this composition as well.

      } else {

        if (OmniUtil.asSuperType(type)) {

          if (!classDec.extends) {
            classDec.extends = new Code.ExtendsDeclaration(new Code.TypeList(root.getAstUtils().createTypeNode(type)));
          } else {

            if (type.kind === OmniTypeKind.OBJECT) {
              const interfaceType = CodeAstUtils.addInterfaceOf(type, root, options);
              implementsDeclarations.types.children.push(root.getAstUtils().createTypeNode(interfaceType));
            } else if (type.kind === OmniTypeKind.INTERFACE) {
              implementsDeclarations.types.children.push(root.getAstUtils().createTypeNode(type));
            }

            for (const property of OmniUtil.getPropertiesOf(type)) {
              CodeAstUtils.addOmniPropertyToBlockAsField({
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
    declaration: Code.AbstractObjectDeclaration,
    options: PackageOptions & TargetOptions & CodeOptions,
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
      if (xor.kind === OmniTypeKind.ENUM) {
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
    options: PackageOptions & TargetOptions & CodeOptions,
    features: TargetFeatures,
  ) {

    const fieldAnnotations = new Code.AnnotationList();
    fieldAnnotations.children.push(new Code.VirtualAnnotationNode({kind: VirtualAnnotationKind.SERIALIZATION_VALUE}));

    const untypedFieldType: OmniUnknownType = {
      kind: OmniTypeKind.UNKNOWN,
      unknownKind: UnknownKind.DYNAMIC,
    };

    const untypedField = new Code.Field(
      root.getAstUtils().createTypeNode(untypedFieldType),
      new Code.Identifier('_raw', 'raw'),
      new Code.ModifierList(new Code.Modifier(Code.ModifierKind.PRIVATE), new Code.Modifier(Code.ModifierKind.FINAL)),
      undefined,
      fieldAnnotations,
    );
    const untypedGetter = new Code.FieldBackedGetter(
      new Code.FieldReference(untypedField),
    );

    target.children.push(untypedField);
    target.children.push(untypedGetter);

    const handled: OmniType[] = [];

    for (const type of types) {

      const otherType = handled.find(it => {
        const commonDenominator = OmniUtil.getCommonDenominatorBetween(it, type, features);
        if (!commonDenominator) {
          return false;
        }

        const isDiff = OmniUtil.getDiffAmount(commonDenominator.diffs) > 0;

        logger.trace(`Diffs ${isDiff} for ${OmniUtil.describe(it)} vs ${OmniUtil.describe(type)}: ${commonDenominator.diffs}}`);
        return !isDiff;
      });

      if (otherType) {

        logger.debug(`\nSkipping runtime-mapped: ${OmniUtil.describe(type)}\nbecause already has: ${OmniUtil.describe(otherType)}`);
        continue;
      }

      handled.push(type);

      const pair = this.createdTypedPair(root, untypedField, type, options);

      target.children.push(pair.field);
      target.children.push(pair.method);
    }
  }

  private addEnumAndPrimitivesAsObjectEnum(
    root: RootAstNode,
    enumTypes: OmniEnumType[],
    primitiveTypes: OmniPrimitiveType[],
    declaration: Code.AbstractObjectDeclaration,
    options: TargetOptions & CodeOptions,
  ): void {

    // Java does not support advanced enums. We need to handle it some other way.
    // There are two different solutions that I can see:
    // 1. @JsonValue and a string field and a getter which converts to the Enum, and another getter for unknown values
    // 2. Convert the enum into an object with public static final fields which represent the enum values

    const primitiveKinds = new Set<OmniPrimitiveKinds>();

    const singletonFactoryMethodIdentifier = new Code.Identifier('get');
    const knownValueFields: Code.Field[] = [];

    const checkMethods: Code.MethodDeclaration[] = [];

    const fieldValueIdentifier = new Code.Identifier(`_value`);
    const fieldValueType = root.getAstUtils().createTypeNode({
      kind: OmniTypeKind.UNKNOWN,
      unknownKind: UnknownKind.OBJECT,
      debug: 'Enum backing-value',
    });

    const fieldAnnotations = new Code.AnnotationList();
    fieldAnnotations.children.push(new Code.VirtualAnnotationNode({kind: VirtualAnnotationKind.SERIALIZATION_VALUE}));

    const fieldValue = new Code.Field(
      fieldValueType,
      fieldValueIdentifier,
      new Code.ModifierList(
        new Code.Modifier(Code.ModifierKind.PRIVATE),
        new Code.Modifier(Code.ModifierKind.FINAL),
      ),
      undefined,
      fieldAnnotations,
    );

    for (const enumType of enumTypes) {
      primitiveKinds.add(enumType.itemKind);
      if (enumType.members.length === 0) {

        // If we have no enum constants, we can't really do much, since we do not know any values.
        continue;
      }

      const knownEnumFields: Code.Field[] = [];
      for (const enumMember of enumType.members) {

        // TODO: Instead use a constructor and each field should be a singleton instance
        const fieldIdentifier = new Code.Identifier(Case.constant(String(enumMember.value)));

        const field = new Code.Field(
          declaration.type,
          fieldIdentifier,
          new Code.ModifierList(
            new Code.Modifier(Code.ModifierKind.PUBLIC),
            new Code.Modifier(Code.ModifierKind.STATIC),
            new Code.Modifier(Code.ModifierKind.FINAL),
          ),
          new Code.MethodCall(
            new Code.MemberAccess(new Code.ClassName(declaration.type), singletonFactoryMethodIdentifier),
            new Code.ArgumentList(
              // TODO: Somehow in the future reference the Enum item instead of the string value
              new Code.Literal(enumMember.value, enumType.itemKind),
            ),
          ),
        );

        knownEnumFields.push(field);
        declaration.body.children.push(field);
      }

      const knownBinary = this.createSelfIfOneOfStaticFieldsBinary(knownEnumFields, declaration.type);
      if (knownBinary) {

        const enumTypeName = Case.pascal(Naming.unwrap(enumType.name));
        checkMethods.push(new Code.MethodDeclaration(
          new Code.MethodDeclarationSignature(
            new Code.Identifier(`is${enumTypeName}`),
            root.getAstUtils().createTypeNode({kind: OmniTypeKind.BOOL}),
          ),
          new Code.Block(
            new Code.Statement(
              new Code.ReturnStatement(knownBinary),
            ),
          ),
        ));

        // TODO: In the future, somehow make this cast value into Tag directly, without runtime lookup.
        checkMethods.push(new Code.MethodDeclaration(
          new Code.MethodDeclarationSignature(
            new Code.Identifier(`getAs${enumTypeName}`),
            root.getAstUtils().createTypeNode(enumType),
          ),
          new Code.Block(
            new Code.Statement(
              new Code.ReturnStatement(
                new Code.MethodCall(
                  // NOTE: Is it really all right creating a new Java.Type here? Should we not used the *REAL* target?
                  //        Since it might be in a separate package based on specific language needs
                  new Code.MemberAccess(new Code.ClassName(root.getAstUtils().createTypeNode(enumType)), new Code.Identifier('valueOf')),
                  new Code.ArgumentList(
                    new Code.Cast(
                      root.getAstUtils().createTypeNode({kind: enumType.itemKind}),
                      new Code.MemberAccess(new Code.SelfReference(), new Code.FieldReference(fieldValue)),
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
      let fieldIdentifier: Code.Identifier;
      const valueConstant = primitiveType.value;

      if (typeof valueConstant == 'string') {
        fieldIdentifier = new Code.Identifier(CodeUtil.getSafeIdentifierName(Case.constant(valueConstant)));
      } else {
        fieldIdentifier = new Code.Identifier(Case.constant(String(valueConstant)));
      }

      const field = new Code.Field(
        declaration.type,
        fieldIdentifier,
        new Code.ModifierList(
          new Code.Modifier(Code.ModifierKind.PUBLIC),
          new Code.Modifier(Code.ModifierKind.STATIC),
          new Code.Modifier(Code.ModifierKind.FINAL),
        ),
        new Code.MethodCall(
          new Code.MemberAccess(new Code.ClassName(declaration.type), singletonFactoryMethodIdentifier),
          new Code.ArgumentList(
            new Code.Literal(valueConstant, primitiveType.kind),
          ),
        ),
      );

      knownValueFields.push(field);
      declaration.body.children.push(field);
    }

    const dictionaryIdentifier = new Code.Identifier(`_values`);
    const fieldValuesType: OmniType = {
      kind: OmniTypeKind.DICTIONARY,
      keyType: fieldValueType.omniType,
      valueType: declaration.type.omniType,
    };

    const fieldValues = new Code.Field(
      root.getAstUtils().createTypeNode(fieldValuesType, false),
      dictionaryIdentifier,
      new Code.ModifierList(
        new Code.Modifier(Code.ModifierKind.PRIVATE),
        new Code.Modifier(Code.ModifierKind.STATIC),
        new Code.Modifier(Code.ModifierKind.FINAL),
      ),
      new Code.NewStatement(root.getAstUtils().createTypeNode(fieldValuesType, true)),
    );
    declaration.body.children.push(fieldValues);

    const fieldValuesStaticTarget = new Code.StaticMemberReference(
      new Code.ClassName(declaration.type),
      new Code.FieldReference(fieldValues),
      // fieldValues.identifier,
    );

    const singletonFactoryParamIdentifier = new Code.Identifier('value');
    const createdIdentifier = new Code.Identifier('created');

    const singletonFactoryParameterDeclaration = new Code.Parameter(
      fieldValueType,
      singletonFactoryParamIdentifier,
    );

    const createdVariableDeclaration = new Code.VariableDeclaration(
      createdIdentifier,
      new Code.NewStatement(
        declaration.type,
        new Code.ArgumentList(
          new Code.DeclarationReference(singletonFactoryParameterDeclaration),
        ),
      ),
      undefined,
      true,
    );

    const singletonMethodAnnotations = new Code.AnnotationList();
    singletonMethodAnnotations.children.push(new Code.VirtualAnnotationNode({kind: VirtualAnnotationKind.DESERIALIZATION_CREATOR}));

    const singletonFactory = new Code.MethodDeclaration(
      new Code.MethodDeclarationSignature(
        singletonFactoryMethodIdentifier,
        declaration.type,
        new Code.ParameterList(singletonFactoryParameterDeclaration),
        new Code.ModifierList(
          new Code.Modifier(Code.ModifierKind.PUBLIC),
          new Code.Modifier(Code.ModifierKind.STATIC),
        ),
        singletonMethodAnnotations,
      ),
      new Code.Block(
        new Code.IfElseStatement(
          [
            new Code.IfStatement(
              new Code.BinaryExpression(
                new Code.MethodCall(
                  new Code.MemberAccess(fieldValuesStaticTarget, new Code.Identifier('containsKey')),
                  new Code.ArgumentList(
                    new Code.DeclarationReference(singletonFactoryParameterDeclaration),
                  ),
                ),
                Code.TokenKind.EQUALS,
                new Code.Literal(true),
              ),
              new Code.Block(
                new Code.Statement(
                  new Code.ReturnStatement(
                    new Code.MethodCall(
                      new Code.MemberAccess(fieldValuesStaticTarget, new Code.Identifier('get')),
                      new Code.ArgumentList(
                        new Code.DeclarationReference(singletonFactoryParameterDeclaration),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
          new Code.Block(
            new Code.Statement(createdVariableDeclaration),
            new Code.Statement(
              new Code.BinaryExpression(
                new Code.IndexAccess(fieldValuesStaticTarget, new Code.DeclarationReference(singletonFactoryParameterDeclaration)),
                Code.TokenKind.ASSIGN,
                new Code.DeclarationReference(createdVariableDeclaration),
              ),
              // new Code.MethodCall(
              //   new Code.MemberAccess(fieldValuesStaticTarget, new Code.Identifier('put')),
              //   new Code.ArgumentList(
              //     new Code.DeclarationReference(singletonFactoryDeclaration),
              //     new Code.DeclarationReference(createdVariableDeclaration),
              //   ),
              // ),
            ),
            new Code.Statement(
              new Code.ReturnStatement(
                new Code.DeclarationReference(createdVariableDeclaration),
              ),
            ),
          ),
        ),
      ),
    );

    declaration.body.children.push(singletonFactory);
    declaration.body.children.push(fieldValue);
    declaration.body.children.push(
      new Code.FieldBackedGetter(
        new Code.FieldReference(fieldValue),
      ),
    );

    this.addSelfIfOfOneOfStaticFieldsMethod(root, knownValueFields, declaration);

    // Add any check methods that we have created.
    declaration.body.children.push(...checkMethods);

    // NOTE: This might be better to handle so we have one constructor per known primitive kind.

    const parameterIdentifier = new Code.Identifier('value');
    const constructorParameter = new Code.ConstructorParameter(
      new Code.FieldReference(fieldValue),
      fieldValueType,
      parameterIdentifier,
    );

    const constructorDec = new Code.ConstructorDeclaration(
      new Code.ConstructorParameterList(constructorParameter),
      new Code.Block(
        new Code.Statement(
          new Code.BinaryExpression(
            new Code.MemberAccess(new Code.SelfReference(), new Code.FieldReference(fieldValue)),
            Code.TokenKind.ASSIGN,
            new Code.DeclarationReference(constructorParameter),
          ),
        ),
      ),
      // Private constructor, since all creation should go through the singleton method.
      new Code.ModifierList(
        new Code.Modifier(Code.ModifierKind.PRIVATE),
      ),
    );

    if (options.debug) {
      constructorDec.comments = CodeUtil.addComment(constructorDec.comments, `Constructor for composition`);
    }

    declaration.body.children.push(constructorDec);
  }

  private addSelfIfOfOneOfStaticFieldsMethod(
    root: RootAstNode,
    knownValueFields: Code.Field[],
    declaration: Code.AbstractObjectDeclaration,
  ): void {

    const knownBinary = this.createSelfIfOneOfStaticFieldsBinary(knownValueFields, declaration.type);
    if (knownBinary) {
      declaration.body.children.push(
        new Code.MethodDeclaration(
          new Code.MethodDeclarationSignature(
            new Code.Identifier('isKnown'),
            root.getAstUtils().createTypeNode({
              kind: OmniTypeKind.BOOL,
              nullable: false,
            }),
          ),
          new Code.Block(
            new Code.Statement(
              new Code.ReturnStatement(knownBinary),
            ),
          ),
        ),
      );
    }
  }

  private createSelfIfOneOfStaticFieldsBinary(
    knownValueFields: Code.Field[],
    selfType: TypeNode,
  ): Code.BinaryExpression | undefined {

    let knownBinary: Code.BinaryExpression | undefined = undefined;
    for (const element of knownValueFields) {

      const binaryExpression = new Code.BinaryExpression(
        new Code.SelfReference(),
        Code.TokenKind.EQUALS,
        new Code.StaticMemberReference(
          new Code.ClassName(selfType),
          element.identifier,
        ),
      );

      if (knownBinary) {
        knownBinary = new Code.BinaryExpression(knownBinary, Code.TokenKind.OR, binaryExpression);
      } else {
        knownBinary = binaryExpression;
      }
    }

    return knownBinary;
  }

  private createdTypedPair(
    root: RootAstNode,
    untypedField: Code.Field,
    type: OmniType,
    options: PackageOptions & TargetOptions & CodeOptions,
  ): TypedPair {

    const typedFieldName = Case.camel(Naming.unwrap(OmniUtil.getVirtualTypeName(type)));

    const typedField = new Code.Field(root.getAstUtils().createTypeNode(type), new Code.Identifier(`_${typedFieldName}`));
    const typedFieldReference = new Code.FieldReference(typedField);

    const parameterList = new Code.ParameterList();
    let conversionExpression: AbstractCodeNode;
    if (options.unknownType == UnknownKind.DYNAMIC_OBJECT || options.unknownType == UnknownKind.ANY) {
      conversionExpression = this.modifyGetterForPojo(untypedField, typedField, parameterList);
    } else {
      conversionExpression = new Code.Literal('Conversion path unknown');
    }

    const typedGetter = new Code.MethodDeclaration(
      new Code.MethodDeclarationSignature(
        new Code.GetterIdentifier(typedField.identifier, typedField.type.omniType),
        typedField.type,
        parameterList,
      ),
      new Code.Block(
        // First check if we have already cached the result.
        new Code.IfStatement(
          new Code.BinaryExpression(new Code.MemberAccess(new Code.SelfReference(), typedFieldReference), Code.TokenKind.NOT_EQUALS, new Code.Literal(null)),
          new Code.Block(new Code.Statement(new Code.ReturnStatement(new Code.MemberAccess(new Code.SelfReference(), typedFieldReference)))),
        ),
        // If not, then try to convert the raw value into the target type and cache it.
        new Code.Statement(new Code.ReturnStatement(
          new Code.BinaryExpression(new Code.MemberAccess(new Code.SelfReference(), typedFieldReference), Code.TokenKind.ASSIGN, conversionExpression),
        )),
      ),
    );

    return {
      field: typedField,
      method: typedGetter,
    };
  }

  private modifyGetterForPojo(
    untypedField: Code.Field,
    typedField: Code.Field,
    parameterList: Code.ParameterList,
  ): AbstractCodeNode {

    const transformerIdentifier = new Code.Identifier('transformer');

    const delegateNode = new Code.Delegate(
      [untypedField.type],
      typedField.type,
      DelegateKind.CONVERTER,
    );

    const transformerParameter = new Code.Parameter(delegateNode, transformerIdentifier);
    parameterList.children.push(transformerParameter);

    return new Code.DelegateCall(
      new Code.DeclarationReference(transformerParameter),
      new Code.GenericRef(delegateNode),
      new Code.ArgumentList(
        new Code.MemberAccess(new Code.SelfReference(), new Code.FieldReference(untypedField)),
      ),
    );
  }
}
