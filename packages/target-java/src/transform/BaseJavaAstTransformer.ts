import {AbstractJavaAstTransformer} from './AbstractJavaAstTransformer';
import {JavaOptions} from '../options';
import {
  Case,
  CompositionKind,
  ExternalSyntaxTree,
  NamePair,
  Naming,
  OmniCompositionType,
  OmniEnumType,
  OmniExamplePairing,
  OmniGenericSourceIdentifierType,
  OmniGenericSourceType,
  OmniHardcodedReferenceType,
  OmniLinkMapping,
  OmniModel,
  OmniOptionallyNamedType,
  OmniOutput,
  OmniPotentialInterfaceType,
  OmniPrimitiveConstantValue,
  OmniPrimitiveKind,
  OmniPrimitiveType,
  OmniProperty,
  OmniType,
  OmniTypeKind,
  OmniUtil,
  PrimitiveNullableKind,
  RealOptions,
} from '@omnigen/core';
import * as Java from '../ast';
import {AbstractObjectDeclaration} from '../ast';
import {JavaSubTypeCapableType, JavaUtil} from '../util';
import {JavaAstUtils} from '../transform';

export class BaseJavaAstTransformer extends AbstractJavaAstTransformer {

  private readonly _primitiveWrapperMap = new Map<string, Java.ClassDeclaration>();

  transformAst(
    model: OmniModel,
    root: Java.JavaAstRootNode,
    _externals: ExternalSyntaxTree<Java.JavaAstRootNode, JavaOptions>[],
    options: RealOptions<JavaOptions>,
  ): Promise<void> {

    // TODO: Need to figure out where the wrong JsonRpcErrorResponse comes from. Something is missed in the replacement!

    const exportableTypes = OmniUtil.getAllExportableTypes(model, model.types);

    for (const type of exportableTypes.all) {
      if (type.kind == OmniTypeKind.PRIMITIVE && type.nullable == PrimitiveNullableKind.NOT_NULLABLE_PRIMITIVE) {

        // The primitive is said to not be nullable, but to still be a primitive.
        // This is not really possible in Java, so we need to wrap it inside a custom class.
        const kindName = Case.pascal(JavaUtil.getPrimitiveTypeName(type));
        let primitiveClass = this._primitiveWrapperMap.get(kindName);
        if (!primitiveClass) {

          primitiveClass = this.createNotNullablePrimitiveWrapper(type, kindName);
          this._primitiveWrapperMap.set(kindName, primitiveClass);

          root.children.push(
            new Java.CompilationUnit(
              new Java.PackageDeclaration(JavaUtil.getPackageName(type, primitiveClass.name.value, options)),
              new Java.ImportList([]),
              primitiveClass,
            ),
          );
        }

        this.replaceTypeWithReference(type, type, options);
      }
    }

    const namePairs: NamePair<OmniOptionallyNamedType>[] = [];
    for (const type of exportableTypes.all) {
      if (type.kind == OmniTypeKind.GENERIC_SOURCE_IDENTIFIER) {
        // These should keep their names, which are generally just 'T'.
        continue;
      }

      // NOTE: Check if wrapped type has a name and resolve/change it too?
      const unwrappedType = OmniUtil.getUnwrappedType(type);
      if ('name' in unwrappedType) {
        namePairs.push({
          owner: unwrappedType,
          name: unwrappedType.name,
        });
      }
    }

    if (namePairs.length > 0) {
      const resolved = Naming.unwrap(namePairs);
      for (const pair of resolved) {
        pair.owner.name = Naming.prefixedPascalCase(pair.name);
      }
    }

    const removedTypes: OmniType[] = [];
    for (const type of exportableTypes.all) {
      removedTypes.push(...this.simplifyTypeAndReturnUnwanted(type));
    }

    // NOTE: Is this actually correct? Could it not delete types we actually want?
    exportableTypes.all = exportableTypes.all.filter(it => !removedTypes.includes(it));

    for (const type of exportableTypes.all) {

      if (type.kind == OmniTypeKind.ARRAY) {

        // What do we do here?

      } else if (type.kind == OmniTypeKind.ENUM) {
        this.transformEnum(model, type, undefined, root, options);
      } else if (type.kind == OmniTypeKind.COMPOSITION) {

        // A composition type is likely just like any other object.
        // Just that has no real content in itself, but made up of the different parts.
        // If the composition is a "extends A and B"
        // Then it should be extending A, and implementing B interface, and rendering B properties
        if (type.compositionKind == CompositionKind.XOR) {

          // In Java only the XOR composition is rendered as a separate compilation unit.
          // That is because multiple inheritance does not exist, so it needs to be done manually.
          const subType = JavaUtil.asSubType(type);
          if (subType) {
            this.transformSubType(model, subType, undefined, options, root);
          }
        }

      } else if (type.kind == OmniTypeKind.OBJECT) {
        this.transformSubType(model, type, undefined, options, root);
      } else if (type.kind == OmniTypeKind.INTERFACE) {
        if (type.of.kind == OmniTypeKind.GENERIC_TARGET) {
          throw new Error(`Do not know yet how to handle a generic interface. Fix it.`);
        } else {
          this.transformInterface(type, options, root);
        }
      } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
        this.transformSubType(model, type.of, type, options, root, type.sourceIdentifiers);
      }
    }

    return Promise.resolve();
  }

  private createNotNullablePrimitiveWrapper(type: OmniPrimitiveType, kindName: string): Java.ClassDeclaration {

    const valueType: OmniPrimitiveType = {
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: type.primitiveKind,
    };

    const valueIdentifier = new Java.Identifier('value');
    const valueField = new Java.Field(
      JavaAstUtils.createTypeNode(valueType),
      valueIdentifier,
      new Java.ModifierList(
        new Java.Modifier(Java.ModifierType.PRIVATE),
        new Java.Modifier(Java.ModifierType.FINAL),
      ),
      undefined,
      new Java.AnnotationList(
        new Java.Annotation(
          new Java.RegularType({
            kind: OmniTypeKind.HARDCODED_REFERENCE,
            fqn: 'com.fasterxml.jackson.annotation.JsonValue',
          }),
        ),
      ),
    );

    return new Java.ClassDeclaration(
      new Java.RegularType(valueType),
      new Java.Identifier(`Primitive${kindName}`),
      new Java.Block(
        valueField,
        // Force the name to be "getValue" so that it does not become "isValue" for a primitive boolean.
        new Java.FieldBackedGetter(valueField, undefined, undefined, new Java.Identifier('getValue')),
      ),
    );
  }

  private transformEnum(
    model: OmniModel,
    type: OmniEnumType,
    originalType: OmniType | undefined,
    root: Java.JavaAstRootNode,
    options: RealOptions<JavaOptions>,
  ): void {
    const body = new Java.Block();

    const enumDeclaration = new Java.EnumDeclaration(
      new Java.RegularType(type),
      new Java.Identifier(JavaUtil.getClassName(originalType || type, options)),
      body,
    );

    JavaAstUtils.addGeneratedAnnotation(enumDeclaration);

    const comments = BaseJavaAstTransformer.getCommentsForType(type, model, options);
    if (comments.length > 0) {
      enumDeclaration.comments = new Java.CommentList(...comments.map(it => new Java.Comment(it)));
    }

    if (type.enumConstants) {

      body.children.push(
        new Java.EnumItemList(
          ...type.enumConstants.map(item => new Java.EnumItem(
            new Java.Identifier(Case.constant(String(item))),
            new Java.Literal(item, type.primitiveKind),
          )),
        ),
      );

      // NOTE: It would be better if we did not need to create this. Leaking responsibilities.
      //        Should the GenericEnumType contain a "valueType" that is created by parser? Probably.
      const itemType: OmniPrimitiveType = {
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: type.primitiveKind,
      };

      const fieldType = new Java.RegularType(itemType);
      const fieldIdentifier = new Java.Identifier('value');
      const field = new Java.Field(
        fieldType,
        fieldIdentifier,
        undefined,
      );

      body.children.push(field);

      body.children.push(
        new Java.ConstructorDeclaration(
          enumDeclaration,
          new Java.ArgumentDeclarationList(new Java.ArgumentDeclaration(fieldType, fieldIdentifier)),
          new Java.Block(
            new Java.Statement(
              new Java.AssignExpression(new Java.FieldReference(field), new Java.VariableReference(fieldIdentifier)),
            ),
          ),
          new Java.ModifierList(),
        ),
      );
    }

    root.children.push(new Java.CompilationUnit(
      new Java.PackageDeclaration(JavaUtil.getPackageName(type, enumDeclaration.name.value, options)),
      new Java.ImportList(
        [],
      ),
      enumDeclaration,
    ));
  }

  private transformInterface(
    type: OmniPotentialInterfaceType,
    options: RealOptions<JavaOptions>,
    root: Java.JavaAstRootNode,
    prefix?: string,
    suffix?: string,
  ): Java.InterfaceDeclaration {

    const declaration = new Java.InterfaceDeclaration(
      JavaAstUtils.createTypeNode(type),
      new Java.Identifier(`${prefix ? prefix : ''}${JavaUtil.getClassName(type, options)}${suffix ? suffix : ''}`),
      new Java.Block(),
    );

    JavaAstUtils.addGeneratedAnnotation(declaration);
    JavaAstUtils.addInterfaceProperties(type, declaration.body);

    root.children.push(new Java.CompilationUnit(
      new Java.PackageDeclaration(JavaUtil.getPackageName(type, declaration.name.value, options)),
      new Java.ImportList(
        [],
      ),
      declaration,
    ));

    return declaration;
  }

  // TODO: Merge functionality for object and composition
  private transformSubType(
    model: OmniModel,
    type: JavaSubTypeCapableType,
    originalType: OmniGenericSourceType | undefined,
    options: RealOptions<JavaOptions>,
    root: Java.JavaAstRootNode,
    genericSourceIdentifiers?: OmniGenericSourceIdentifierType[],
  ): void {

    // TODO: This could be an interface, if it's only extended from, and used in multiple inheritance.
    //        Make use of the DependencyGraph to figure things out...
    const body = new Java.Block();

    if (type.kind == OmniTypeKind.OBJECT) {
      if (type.extendedBy && type.extendedBy.kind == OmniTypeKind.ENUM) {
        // TODO: Maybe this could be removed and instead simplified elsewhere, where we compress/fix "incorrect" types?
        // In Java we cannot extend from an enum. So we will try and redirect the output.
        if (OmniUtil.isEmptyType(type)) {
          // TODO: The NAME of the resulting enum should still be the name of the current type, and not the extended class!
          this.transformEnum(model, type.extendedBy, type, root, options);
          return;
        } else {
          throw new Error('Do not know how to handle this type, since Java cannot inherit from en Enum');
        }
      }
    }

    const javaClassName = JavaUtil.getClassName(originalType || type, options);
    const javaType = new Java.RegularType(type);

    let declaration: Java.ClassDeclaration | Java.GenericClassDeclaration | Java.InterfaceDeclaration;
    if (genericSourceIdentifiers) {
      declaration = new Java.GenericClassDeclaration(
        new Java.Identifier(javaClassName),
        javaType,
        new Java.GenericTypeDeclarationList(
          genericSourceIdentifiers.map(it => new Java.GenericTypeDeclaration(
            new Java.Identifier(it.placeholderName),
            it.lowerBound ? JavaAstUtils.createTypeNode(it.lowerBound) : undefined,
            it.upperBound ? JavaAstUtils.createTypeNode(it.upperBound) : undefined,
          )),
        ),
        body,
      );
    } else {
      declaration = new Java.ClassDeclaration(
        javaType,
        new Java.Identifier(javaClassName),
        body,
      );
    }

    // TODO: Move into a separate transformer, and make it an option
    JavaAstUtils.addGeneratedAnnotation(declaration);

    const comments = BaseJavaAstTransformer.getCommentsForType(type, model, options);

    if (type.kind == OmniTypeKind.COMPOSITION && type.compositionKind == CompositionKind.XOR) {
      this.addXOrMappingToBody(model, type, declaration, comments, options);
    }

    this.addExtendsAndImplements(model, type, declaration);

    if (comments.length > 0) {
      declaration.comments = new Java.CommentList(...comments.map(it => new Java.Comment(it)));
    }

    root.children.push(new Java.CompilationUnit(
      new Java.PackageDeclaration(JavaUtil.getPackageName(type, declaration.name.value, options)),
      new Java.ImportList(
        [],
      ),
      declaration,
    ));
  }

  private addExtendsAndImplements(
    model: OmniModel,
    type: JavaSubTypeCapableType,
    declaration: Java.AbstractObjectDeclaration,
  ): void {

    if (type.kind == OmniTypeKind.OBJECT && type.subTypeHints) {

      // Instead of making the current class inherit from something,
      // We will with the help of external libraries note what kind of class this might be.
      // Goes against how polymorphism is supposed to work, in a way, but some webservices do it this way.
      // That way methods can receive an Abstract class, but be deserialized as the correct implementation.
      // See: https://swagger.io/docs/specification/data-models/inheritance-and-polymorphism/

      // We make use the the same property for all, since it is not supported in Java to have many different ones anyway.
      const propertyName = type.subTypeHints[0].qualifiers[0].path[0];

      // TODO: Need to figure out an actual way of handling the inheritance
      //         If "In" is itself empty and only inherits, then use "Abs" directly instead?
      //         What to do if that is not possible? Need to make it work as if "In" also has properties!

      declaration.annotations?.children.push(
        new Java.Annotation(
          new Java.RegularType({
            kind: OmniTypeKind.HARDCODED_REFERENCE,
            fqn: 'com.fasterxml.jackson.annotation.JsonTypeInfo',
          }),
          new Java.AnnotationKeyValuePairList(
            new Java.AnnotationKeyValuePair(
              new Java.Identifier('use'),
              new Java.StaticMemberReference(
                new Java.ClassName(
                  new Java.RegularType({
                    kind: OmniTypeKind.HARDCODED_REFERENCE,
                    fqn: 'com.fasterxml.jackson.annotation.JsonTypeInfo.Id',
                  }),
                ),
                new Java.Identifier(
                  'NAME',
                ),
              ),
            ),
            new Java.AnnotationKeyValuePair(
              new Java.Identifier('property'),
              new Java.Literal(propertyName),
            ),
          ),
        ),
      );

      const subTypes: Java.Annotation[] = [];
      for (const subTypeHint of type.subTypeHints) {

        const qualifier = subTypeHint.qualifiers[0];
        subTypes.push(new Java.Annotation(
          new Java.RegularType({
            kind: OmniTypeKind.HARDCODED_REFERENCE,
            fqn: 'com.fasterxml.jackson.annotation.JsonSubTypes.Type',
          }),
          new Java.AnnotationKeyValuePairList(
            new Java.AnnotationKeyValuePair(
              new Java.Identifier('name'),
              new Java.Literal(OmniUtil.toLiteralValue(qualifier.value)),
            ),
            new Java.AnnotationKeyValuePair(
              new Java.Identifier('value'),
              new Java.ClassReference(JavaAstUtils.createTypeNode(subTypeHint.type)),
            ),
          ),
        ));
      }

      declaration.annotations?.children.push(
        new Java.Annotation(
          new Java.RegularType({
            kind: OmniTypeKind.HARDCODED_REFERENCE,
            fqn: 'com.fasterxml.jackson.annotation.JsonSubTypes',
          }),
          new Java.AnnotationKeyValuePairList(
            new Java.AnnotationKeyValuePair(
              undefined,
              new Java.ArrayInitializer<Java.Annotation>(
                ...subTypes,
              ),
            ),
          ),
        ),
      );
    }

    const typeExtends = JavaUtil.getSuperClassOfSubType(model, type);

    if (typeExtends) {

      declaration.extends = new Java.ExtendsDeclaration(
        JavaAstUtils.createTypeNode(typeExtends),
      );
    }

    if (type.kind != OmniTypeKind.COMPOSITION) {
      const typeImplements = JavaUtil.getSuperInterfacesOfSubType(model, type);
      if (typeImplements.length > 0) {
        declaration.implements = new Java.ImplementsDeclaration(
          new Java.TypeList(typeImplements.map(it => JavaAstUtils.createTypeNode(it))),
        );
      }
    }
  }

  private addXOrMappingToBody(
    model: OmniModel,
    type: OmniCompositionType<JavaSubTypeCapableType | OmniPrimitiveType, CompositionKind>,
    declaration: AbstractObjectDeclaration,
    _comments: string[], // TODO: Add the comments to whatever is created?
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
        new Java.RuntimeTypeMapping(
          type.types,
          options,
          t => BaseJavaAstTransformer.getCommentsForType(t, model, options).map(it => new Java.Comment(it)),
        ),
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
      isAny: true,
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

      if (!primitiveType.valueConstant) {

        // We have no idea what the value is supposed to contain.
        // So there is not really much we can do here. It will be up to the user to check the "isKnown()" method.
        continue;
      }

      // This primitive type has a value constant, so we can treat it as a known value, like an ENUM.
      let fieldIdentifier: Java.Identifier;
      let valueConstant: OmniPrimitiveConstantValue;
      if (typeof primitiveType.valueConstant == 'function') {
        valueConstant = primitiveType.valueConstant(primitiveType); // TODO: Check if this is correct
      } else {
        valueConstant = primitiveType.valueConstant;
      }

      if (typeof valueConstant == 'string') {
        fieldIdentifier = new Java.Identifier(JavaUtil.getSafeIdentifierName(Case.constant(valueConstant)));
      } else {
        fieldIdentifier = new Java.Identifier(`_${Case.constant(String(valueConstant))}`);
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

    const singletonFactory = new Java.MethodDeclaration(
      new Java.MethodDeclarationSignature(
        singletonFactoryMethodIdentifier,
        declaration.type,
        new Java.ArgumentDeclarationList(
          new Java.ArgumentDeclaration(
            fieldValueType,
            singletonFactoryParamIdentifier,
          ),
        ),
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
                    new Java.VariableReference(singletonFactoryParamIdentifier),
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
                        new Java.VariableReference(singletonFactoryParamIdentifier),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
          new Java.Block(
            new Java.Statement(
              new Java.VariableDeclaration(
                createdIdentifier,
                new Java.NewStatement(
                  declaration.type,
                  new Java.ArgumentList(
                    new Java.VariableReference(singletonFactoryParamIdentifier),
                  ),
                ),
                undefined,
                true,
              ),
            ),
            new Java.Statement(
              new Java.MethodCall(
                fieldValuesStaticTarget,
                new Java.Identifier('set'),
                new Java.ArgumentList(
                  new Java.VariableReference(singletonFactoryParamIdentifier),
                  new Java.VariableReference(createdIdentifier),
                ),
              ),
            ),
            new Java.Statement(
              new Java.ReturnStatement(
                new Java.VariableReference(createdIdentifier),
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

    this.addSelfIsOfOneOfStaticFieldsMethod(knownValueFields, declaration);

    // Add any check methods that we have created.
    declaration.body.children.push(...checkMethods);

    // NOTE: This might be better to handle so we have one constructor per known primitive kind.
    // for (const primitiveKind of primitiveKinds) {
    // const typeName = JavaUtil.getPrimitiveKindName(primitiveKind, false);

    const parameterIdentifier = new Java.Identifier('value');

    declaration.body.children.push(
      new Java.ConstructorDeclaration(
        declaration,
        new Java.ArgumentDeclarationList(new Java.ArgumentDeclaration(fieldValueType, parameterIdentifier)),
        new Java.Block(
          new Java.Statement(
            new Java.AssignExpression(new Java.FieldReference(fieldValue), new Java.VariableReference(parameterIdentifier)),
          ),
        ),
        // Private constructor, since all creation should go through the singleton method.
        new Java.ModifierList(
          new Java.Modifier(Java.ModifierType.PRIVATE),
        ),
      ),
    );
  }

  private addSelfIsOfOneOfStaticFieldsMethod(
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
              primitiveKind: OmniPrimitiveKind.BOOL,
              nullable: PrimitiveNullableKind.NOT_NULLABLE_PRIMITIVE,
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
    selfType: Java.Type,
  ): Java.BinaryExpression | undefined {

    let knownBinary: Java.BinaryExpression | undefined = undefined;
    for (let i = 0; i < knownValueFields.length; i++) {

      const binaryExpression = new Java.BinaryExpression(
        new Java.SelfReference(),
        new Java.JavaToken(Java.TokenType.EQUALS),
        new Java.StaticMemberReference(
          new Java.ClassName(selfType),
          knownValueFields[i].identifier,
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

  public static getCommentsForType(type: OmniType, model: OmniModel, options: JavaOptions): string[] {
    const comments: string[] = [];
    if (type.description) {
      comments.push(type.description);
    }
    if (type.summary) {
      comments.push(type.summary);
    }

    const handledResponse: OmniOutput[] = [];
    for (const endpoint of model.endpoints) {

      // TODO: Redo so they are only linked by "@see" and stuff?
      // TODO: Is it even correct to go through the properties?
      // TODO: Should this be more generic, to have a sort of "visitor" for all types of a GenericModel?
      if (endpoint.request.type.kind == OmniTypeKind.OBJECT && endpoint.request.type.properties) {
        for (const property of endpoint.request.type.properties) {
          if (property.type == type) {
            if (property.description) {
              comments.push(property.description);
            }
            if (property.summary) {
              comments.push(property.summary);
            }
          }
        }
      }

      for (const response of endpoint.responses) {

        // Multiple endpoints might have the same response (like generic fallback error).
        // So we have to check that we have not already handled the GenericOutput.
        if (response.type == type && !handledResponse.includes(response)) {
          handledResponse.push(response);

          if (response.description || response.summary) {
            comments.push(`<section>\n<h2>${response.name}</h2>`);

            if (response.description) {
              comments.push(response.description);
            }
            if (response.summary) {
              comments.push(response.summary);
            }

            comments.push(`</section>`);
          }
        }
      }

      for (const example of endpoint.examples) {

        const parameterHasType = (example.params || []).filter(it => it.type == type).length > 0;
        if (example.result.type == type || parameterHasType) {
          comments.push(BaseJavaAstTransformer.getExampleComments(example));
        }
      }
    }

    comments.push(...BaseJavaAstTransformer.getLinkCommentsForType(type, model, options));

    return comments;
  }

  public static getLinkCommentsForType(type: OmniType, model: OmniModel, options: JavaOptions): string[] {
    const comments: string[] = [];
    if (!options.includeLinksOnType) {
      return comments;
    }

    if (type.kind == OmniTypeKind.OBJECT || type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
      for (const continuation of (model.continuations || [])) {

        // Look if any of the continuation source or targets use this type as root.
        // TODO: This could be improved by answering "true" if any in path is true, and make it relative.
        const firstMatch = continuation.mappings
          .some(mapping => {

            if (mapping.source.propertyPath?.length) {
              if (mapping.source.propertyPath[0]?.owner == type) {
                return true;
              }
            }

            if (mapping.target.propertyPath?.length) {
              if (mapping.target.propertyPath[mapping.target.propertyPath.length - 1].owner == type) {
                return true;
              }
            }

            return false;
          });

        if (firstMatch) {

          // There are links between different servers/methods
          comments.push('<section>\n<h2>Links</h2>');
          comments.push(...continuation.mappings.map(mapping => {
            return BaseJavaAstTransformer.getMappingSourceTargetComment(mapping, options);
          }));
          comments.push('</section>');
        }
      }
    }

    return comments;
  }

  public static getLink(propertyOwner: OmniType, property: OmniProperty): string {

    const memberName = `${JavaUtil.getGetterName(property.name, property.type)}()`;
    return `{@link ${JavaUtil.getFullyQualifiedName(propertyOwner)}#${memberName}}`;
  }

  public static getExampleComments(example: OmniExamplePairing): string {

    const commentLines: string[] = [];
    commentLines.push(`<h2>Example - ${example.name}</h2>`);

    if (example.description) {
      commentLines.push(example.description);
    }
    if (example.summary) {
      commentLines.push(example.summary);
    }

    const params = (example.params || []);
    if (params.length > 0) {
      commentLines.push(`<h3>➡ Request</h3>`);

      for (let i = 0; i < params.length; i++) {

        const param = params[i];
        const propertyLink = BaseJavaAstTransformer.getLink(param.property.owner, param.property);
        commentLines.push(`  📌 ${propertyLink} (${param.name}): ${JSON.stringify(param.value)}`);
      }
    }

    if (example.result.description || example.result.summary || example.result.value) {

      commentLines.push(`<h3>↩ Response - ${example.result.name}</h3>`);

      if (example.result.description) {
        commentLines.push(`  💡 ${example.result.description}`);
      }
      if (example.result.summary) {
        commentLines.push(`  💡 ${example.result.summary}`);
      }

      // WRONG CLASS!
      if (example.result.value) {

        let prettyValue: string;
        if (typeof example.result.value == 'string') {
          prettyValue = example.result.value;
        } else {
          prettyValue = JSON.stringify(example.result.value, null, 2);
        }

        commentLines.push(`  ⬅ returns <pre>{@code ${prettyValue}}</pre>`);
      }
    }

    return commentLines.join('\n  ');
  }

  public static getMappingSourceTargetComment(
    mapping: OmniLinkMapping,
    options: JavaOptions,
    only: 'source' | 'target' | undefined = undefined,
  ): string {

    const sourceLinks: string[] = [];
    const targetLinks: string[] = [];

    if (!only || only == 'source') {
      if (mapping.source.propertyPath) {
        const sourcePath = mapping.source.propertyPath || [];
        for (let i = 0; i < sourcePath.length; i++) {
          sourceLinks.push(BaseJavaAstTransformer.getLink(sourcePath[i].owner, sourcePath[i]));
        }
      } else if (mapping.source.constantValue) {
        sourceLinks.push(JSON.stringify(mapping.source.constantValue));
      }
    }

    if (!only || only == 'target') {
      const targetPath = mapping.target.propertyPath;
      for (let i = 0; i < targetPath.length; i++) {

        const typeName = JavaUtil.getFullyQualifiedName(targetPath[i].owner);

        const prop = targetPath[i];
        let memberName: string;
        if (i < targetPath.length - 1) {
          memberName = `${JavaUtil.getGetterName(prop.name, prop.type)}()`;
        } else {
          // TODO: Possible to find the *actual* setter/field and use that as the @link?
          //       We should not need to check for immutability here, should be centralized somehow
          if (options.immutableModels) {
            memberName = prop.name;
          } else {
            memberName = `${JavaUtil.getSetterName(prop.name)}(${JavaUtil.getFullyQualifiedName(prop.type)})`;
          }
        }

        targetLinks.push(`{@link ${typeName}#${memberName}}`);
      }
    }

    if (only == 'source') {
      return `@see Source ${sourceLinks.join('.')}`;
    } else if (only == 'target') {
      return `@see Use ${targetLinks.join('.')}`;
    } else {
      return `Source: ${sourceLinks.join('.')}\nTarget: ${targetLinks.join('.')}`;
    }
  }

  private simplifyTypeAndReturnUnwanted(type: OmniType): OmniType[] {

    // TODO: ComponentsSchemasIntegerOrNull SHOULD NOT HAVE BEEN CREATED! IT SHOULD NOT BE AN OBJECT! IT SHOULD BE A COMPOSITION OF XOR!

    if (type.kind == OmniTypeKind.COMPOSITION) {
      if (type.compositionKind == CompositionKind.XOR) {
        if (type.types.length == 2) {
          const nullType = type.types.find(it => it.kind == OmniTypeKind.NULL);
          if (nullType) {
            const otherType = type.types.find(it => it.kind != OmniTypeKind.NULL);
            if (otherType && otherType.kind == OmniTypeKind.PRIMITIVE) {

              // Clear. then assign all the properties of the Other (plus nullable: true) to target type.
              this.clearProperties(type);
              Object.assign(type, {
                ...otherType,
                nullable: true,
              });
              return [otherType];
            } else if (otherType && otherType.kind == OmniTypeKind.OBJECT) {

              // For Java, any object can always be null.
              // TODO: Perhaps we should find all the places that use the type, and say {required: false}? Or is that not the same thing?
              this.clearProperties(type);
              Object.assign(type, otherType);
              return [otherType];
            }
          }
        }
      }
    }

    return [];
  }

  private clearProperties(type: OmniType): void {
    for (const key of Object.keys(type)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete (type as any)[key];
    }
  }

  private replaceTypeWithReference(
    target: OmniType,
    primitiveType: OmniPrimitiveType,
    options: RealOptions<JavaOptions>,
  ): void {

    // TODO: Replace this with something else? REFERENCE should be for native classes, but this is sort of not?
    target.kind = OmniTypeKind.HARDCODED_REFERENCE;

    const referenceType = target as OmniHardcodedReferenceType;
    const primitiveName = `Primitive${Case.pascal(JavaUtil.getPrimitiveTypeName(primitiveType))}`;
    referenceType.fqn = JavaUtil.getClassNameWithPackageName(referenceType, primitiveName, options);
  }

}
