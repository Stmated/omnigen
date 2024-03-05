import {AbstractJavaAstTransformer, JavaAndTargetOptions, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {CompositionKind, OmniCompositionAndType, OmniCompositionType, OmniEnumType, OmniModel, OmniPrimitiveKind, OmniPrimitiveType, OmniType, OmniTypeKind, UnknownKind} from '@omnigen/core';
import {JavaUtil} from '../util';
import * as Java from '../ast';
import {AbstractObjectDeclaration, JavaAstRootNode} from '../ast';
import {Case, Naming, OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
import {JavaAstUtils} from './JavaAstUtils.ts';
import {JavaOptions} from '../options';

/**
 * There needs to be more centralized handling of adding fields to a class depending on if it is extending or implementing interfaces.
 */
export class AddCompositionMembersJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitClassDeclaration: (node, visitor) => {

        const omniType = node.type.omniType;

        if (omniType.kind == OmniTypeKind.COMPOSITION) {
          if (omniType.compositionKind == CompositionKind.XOR) {
            this.addXOrMappingToBody(omniType, node, args.options);
          } else if (omniType.compositionKind == CompositionKind.AND) {
            this.addAndCompositionToClassDeclaration(args.model, args.root, omniType, node, args.options);
          }
        }

        // Then keep searching deeper, into nested types
        AbstractJavaAstTransformer.JAVA_VISITOR.visitClassDeclaration(node, visitor);
      },
    }));
  }

  /**
   * This is quite wrong, since it is not for certain that one type should be a class and another an interface.
   * This needs to be handled in some other way which orders and/or categorizes the extensions.
   */
  private addAndCompositionToClassDeclaration(model: OmniModel, root: JavaAstRootNode, andType: OmniCompositionAndType, classDec: Java.ClassDeclaration, options: JavaAndTargetOptions): void {

    const implementsDeclarations = new Java.ImplementsDeclaration(
      new Java.TypeList([]),
    );

    for (const type of andType.types) {

      if (type.kind == OmniTypeKind.COMPOSITION && type.compositionKind == CompositionKind.AND) {

        // We can continue deeper, and add fields for this composition as well.

      } else {
        const asSuperType = JavaUtil.asSuperType(type);

        if (asSuperType) {

          if (!classDec.extends) {
            classDec.extends = new Java.ExtendsDeclaration(
              JavaAstUtils.createTypeNode(asSuperType),
            );
          } else {

            if (asSuperType.kind == OmniTypeKind.OBJECT) {
              const interfaceType = JavaAstUtils.addInterfaceOf(asSuperType, root, options);
              implementsDeclarations.types.children.push(JavaAstUtils.createTypeNode(interfaceType));
            } else if (asSuperType.kind == OmniTypeKind.INTERFACE) {
              implementsDeclarations.types.children.push(JavaAstUtils.createTypeNode(asSuperType));
            }

            for (const property of OmniUtil.getPropertiesOf(asSuperType)) {
              JavaAstUtils.addOmniPropertyToBlockAsField(classDec.body, property, options);
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
    type: OmniCompositionType<OmniType | OmniPrimitiveType>,
    declaration: AbstractObjectDeclaration,
    options: JavaOptions,
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
      } else if (xor.kind == OmniTypeKind.PRIMITIVE) {
        primitiveTypes.push(xor);
      } else {
        otherTypeCount++;
      }
    }

    if (enumTypes.length > 0 && primitiveTypes.length > 0 && otherTypeCount == 0) {
      this.addEnumAndPrimitivesAsObjectEnum(enumTypes, primitiveTypes, declaration);
    } else {

      // This means the specification did not have any discriminators.
      // Instead we need to figure out what it is in runtime. To be improved.
      declaration.body.children.push(
        new Java.RuntimeTypeMapping(type.types, options),
      );
    }
  }

  private addEnumAndPrimitivesAsObjectEnum(
    enumTypes: OmniEnumType[],
    primitiveTypes: OmniPrimitiveType[],
    declaration: Java.AbstractObjectDeclaration,
  ): void {

    // Java does not support advanced enums. We need to handle it some other way.
    // There are two different solutions that I can see:
    // 1. @JsonValue and a string field and a getter which converts to the Enum, and another getter for unknown values
    // 2. Convert the enum into an object with public static final fields which represent the enum values

    const primitiveKinds = new Set<OmniPrimitiveKind>();

    const singletonFactoryMethodIdentifier = new Java.Identifier('get');
    const knownValueFields: Java.Field[] = [];

    const checkMethods: Java.MethodDeclaration[] = [];

    const fieldValueIdentifier = new Java.Identifier(`_value`);
    const fieldValueType = new Java.RegularType({
      kind: OmniTypeKind.UNKNOWN,
      unknownKind: UnknownKind.MUTABLE_OBJECT,
    });
    const fieldValue = new Java.Field(
      fieldValueType,
      fieldValueIdentifier,
      new Java.ModifierList(
        new Java.Modifier(Java.ModifierType.PRIVATE),
        new Java.Modifier(Java.ModifierType.FINAL),
      ),
      undefined,
      new Java.AnnotationList(
        new Java.Annotation(
          // TODO: Too specific to fasterxml, should be moved somewhere else/use a generalized annotation type
          new Java.RegularType({
            kind: OmniTypeKind.HARDCODED_REFERENCE,
            fqn: 'com.fasterxml.jackson.annotation.JsonValue',
          }),
        ),
      ),
    );

    for (const enumType of enumTypes) {
      primitiveKinds.add(enumType.primitiveKind);
      if (!enumType.enumConstants) {

        // If we have no enum constants, we can't really do much, since we do not know any values.
        continue;
      }

      const knownEnumFields: Java.Field[] = [];
      for (const enumValue of enumType.enumConstants) {

        // TODO: Instead use a constructor and each field should be a singleton instance
        let fieldIdentifier: Java.Identifier;
        if (typeof enumValue == 'string') {
          fieldIdentifier = new Java.Identifier(Case.constant(enumValue));
        } else {
          fieldIdentifier = new Java.Identifier(Case.constant(`_${String(enumValue)}`));
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
            new Java.ClassName(declaration.type),
            singletonFactoryMethodIdentifier,
            new Java.ArgumentList(
              // TODO: Somehow in the future reference the Enum item instead of the string value
              new Java.Literal(enumValue, enumType.primitiveKind),
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
            JavaAstUtils.createTypeNode({kind: OmniTypeKind.PRIMITIVE, primitiveKind: OmniPrimitiveKind.BOOL}),
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
            JavaAstUtils.createTypeNode(enumType),
          ),
          new Java.Block(
            new Java.Statement(
              new Java.ReturnStatement(
                new Java.MethodCall(
                  // NOTE: Is it really all right creating a new Java.Type here? Should we not used the *REAL* target?
                  //        Since it might be in a separate package based on specific language needs
                  new Java.ClassName(JavaAstUtils.createTypeNode(enumType)),
                  new Java.Identifier('valueOf'),
                  new Java.ArgumentList(
                    new Java.Cast(
                      JavaAstUtils.createTypeNode({
                        kind: OmniTypeKind.PRIMITIVE,
                        primitiveKind: enumType.primitiveKind,
                      }),
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
          new Java.ClassName(declaration.type),
          singletonFactoryMethodIdentifier,
          new Java.ArgumentList(
            new Java.Literal(valueConstant, primitiveType.primitiveKind),
          ),
        ),
      );

      knownValueFields.push(field);
      declaration.body.children.push(field);
    }

    const dictionaryIdentifier = new Java.Identifier(`_values`);
    const fieldValuesType = JavaAstUtils.createTypeNode({
      kind: OmniTypeKind.DICTIONARY,
      keyType: fieldValueType.omniType,
      valueType: declaration.type.omniType,
    });

    const fieldValues = new Java.Field(
      fieldValuesType,
      dictionaryIdentifier,
      new Java.ModifierList(
        new Java.Modifier(Java.ModifierType.PRIVATE),
        new Java.Modifier(Java.ModifierType.STATIC),
        new Java.Modifier(Java.ModifierType.FINAL),
      ),
      new Java.NewStatement(fieldValuesType),
    );
    declaration.body.children.push(fieldValues);

    const fieldValuesStaticTarget = new Java.StaticMemberReference(
      new Java.ClassName(declaration.type),
      fieldValues.identifier,
    );

    const singletonFactoryParamIdentifier = new Java.Identifier('value');
    const createdIdentifier = new Java.Identifier('created');

    const singletonFactoryDeclaration = new Java.ArgumentDeclaration(
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

    const singletonFactory = new Java.MethodDeclaration(
      new Java.MethodDeclarationSignature(
        singletonFactoryMethodIdentifier,
        declaration.type,
        new Java.ArgumentDeclarationList(singletonFactoryDeclaration),
        new Java.ModifierList(
          new Java.Modifier(Java.ModifierType.PUBLIC),
          new Java.Modifier(Java.ModifierType.STATIC),
        ),
        new Java.AnnotationList(
          new Java.Annotation(
            // TODO: Too specific to fasterxml, should be moved somewhere else/use a generalized annotation type
            new Java.RegularType({
              kind: OmniTypeKind.HARDCODED_REFERENCE,
              fqn: 'com.fasterxml.jackson.annotation.JsonCreator',
            }),
          ),
        ),
      ),
      new Java.Block(
        new Java.IfElseStatement(
          [
            new Java.IfStatement(
              new Java.BinaryExpression(
                new Java.MethodCall(
                  fieldValuesStaticTarget,
                  new Java.Identifier('containsKey'),
                  new Java.ArgumentList(
                    new Java.DeclarationReference(singletonFactoryDeclaration),
                  ),
                ),
                new Java.JavaToken(Java.TokenType.EQUALS),
                new Java.Literal(true),
              ),
              new Java.Block(
                new Java.Statement(
                  new Java.ReturnStatement(
                    new Java.MethodCall(
                      fieldValuesStaticTarget,
                      new Java.Identifier('get'),
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
                fieldValuesStaticTarget,
                new Java.Identifier('set'),
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
        fieldValue,
      ),
    );

    this.addSelfIfOfOneOfStaticFieldsMethod(knownValueFields, declaration);

    // Add any check methods that we have created.
    declaration.body.children.push(...checkMethods);

    // NOTE: This might be better to handle so we have one constructor per known primitive kind.
    // for (const primitiveKind of primitiveKinds) {
    // const typeName = JavaUtil.getPrimitiveKindName(primitiveKind, false);

    const parameterIdentifier = new Java.Identifier('value');
    const parameterArgumentDeclaration = new Java.ArgumentDeclaration(fieldValueType, parameterIdentifier);

    declaration.body.children.push(
      new Java.ConstructorDeclaration(
        declaration,
        new Java.ArgumentDeclarationList(parameterArgumentDeclaration),
        new Java.Block(
          new Java.Statement(
            new Java.AssignExpression(
              new Java.FieldReference(fieldValue),
              new Java.DeclarationReference(parameterArgumentDeclaration),
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
    knownValueFields: Java.Field[],
    declaration: Java.AbstractObjectDeclaration,
  ): void {

    const knownBinary = this.createSelfIfOneOfStaticFieldsBinary(knownValueFields, declaration.type);
    if (knownBinary) {
      declaration.body.children.push(
        new Java.MethodDeclaration(
          new Java.MethodDeclarationSignature(
            new Java.Identifier('isKnown'),
            JavaAstUtils.createTypeNode({
              kind: OmniTypeKind.PRIMITIVE,
              nullable: false,
              primitiveKind: OmniPrimitiveKind.BOOL,
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
    selfType: Java.Type<OmniType>,
  ): Java.BinaryExpression | undefined {

    let knownBinary: Java.BinaryExpression | undefined = undefined;
    for (const element of knownValueFields) {

      const binaryExpression = new Java.BinaryExpression(
        new Java.SelfReference(),
        new Java.JavaToken(Java.TokenType.EQUALS),
        new Java.StaticMemberReference(
          new Java.ClassName(selfType),
          element.identifier,
        ),
      );

      if (knownBinary) {
        knownBinary = new Java.BinaryExpression(knownBinary, new Java.JavaToken(Java.TokenType.OR), binaryExpression);
      } else {
        knownBinary = binaryExpression;
      }
    }

    return knownBinary;
  }
}
