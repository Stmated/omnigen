import {AbstractJavaAstTransformer, JavaAndTargetOptions, JavaAstTransformerArgs} from './AbstractJavaAstTransformer';
import {
  NameParts,
  ObjectName,
  OmniDictionaryType,
  OmniInterfaceType, OmniItemKind,
  OmniObjectType,
  OmniPrimitiveType,
  OmniProperty,
  OmniType,
  OmniTypeKind,
  RootAstNode,
  TypeNode,
  TypeUseKind,
  UnknownKind,
} from '@omnigen/api';
import * as Java from '../ast/JavaAst';
import {CreateMode, OmniUtil} from '@omnigen/core';
import {JavaOptions, SerializationLibrary} from '../options';
import {JACKSON_JSON_ANY_GETTER, JACKSON_JSON_ANY_SETTER} from './JacksonJavaAstTransformer';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

const METHOD_GETTER_NAME = 'getAdditionalProperties';
const METHOD_ADDER_NAME = 'addAdditionalProperty';

export const ADDITIONAL_PROPERTIES_FIELD_NAME = 'additionalProperties';

export const LOMBOK_SINGULAR: ObjectName = {namespace: ['lombok'], edgeName: 'Singular'};

/**
 * Replaces a field with a pattern as name with a Map field, along with `get` and `put` methods.
 * Also adds functionality to support (de)serialization libraries such as Jackson.
 */
export class PatternPropertiesToMapJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const replacedProperties = new Map<OmniProperty, Java.AbstractCodeNode>();
    const replacedFieldIds: number[] = [];
    const classDeclarationStack: Java.ClassDeclaration[] = [];
    const decWithDictionary = new Map<number, OmniDictionaryType[]>();
    const decIdToDec = new Map<number, Java.Identifiable>();
    const allDictionaries: OmniDictionaryType[] = [];

    const defaultVisitor = args.root.createVisitor<void>();

    args.root.visit({
      ...defaultVisitor,
      visitClassDeclaration: (n, v) => {
        try {
          classDeclarationStack.push(n);
          defaultVisitor.visitClassDeclaration(n, v);
        } finally {
          classDeclarationStack.pop();
        }
      },
      visitField: n => {

        if (n.property && replacedProperties.has(n.property)) {
          // TODO: This is wrong. We are replacing
          return;
        }

        // Java itself cannot represent pattern properties. But Jackson can give support in the form of annotations.
        if (n.property && OmniUtil.isPatternPropertyName(n.property.name)) {

          const dec = classDeclarationStack[classDeclarationStack.length - 1];
          const dictionaryType = this.propertyToDictionary(n.property);

          (decWithDictionary.has(dec.id) ? decWithDictionary : decWithDictionary.set(dec.id, [])).get(dec.id)!.push(dictionaryType);
          allDictionaries.push(dictionaryType);

          // Replace with something else
          const replacingNodes = this.createJsonAnyNode(args.root, dictionaryType, args.options);

          replacedProperties.set(n.property, replacingNodes);
          replacedFieldIds.push(n.id);
        }
      },
    });

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceClassDeclaration: (n, r) => {

        const reduced = defaultReducer.reduceClassDeclaration(n, r);
        if (reduced && decWithDictionary.has(reduced.id)) {

          // Map id to potentially new class declaration.
          decIdToDec.set(reduced.id, reduced);
        }

        return reduced;
      },
      reduceField: n => {
        return n.property && replacedProperties.has(n.property) ? replacedProperties.get(n.property) : n;
      },
      reduceFieldReference: n => {
        return replacedFieldIds.includes(n.targetId) ? undefined : n;
      },
      reduceBlock: (n, r) => {
        const reduced = defaultReducer.reduceBlock(n, r);
        if (reduced && reduced.children.length == 0 && n.children.length > 0) {
          return undefined;
        }
        return reduced;
      },
      reduceMethodDeclaration: (n, r) => {
        const reduced = defaultReducer.reduceMethodDeclaration(n, r);
        if (reduced && reduced instanceof Java.MethodDeclaration && n.body && !reduced.body) {
          // This was a getter that was removed, so we remove the whole method.
          return undefined;
        }

        return reduced;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }

    if (decWithDictionary.size >= args.options.additionalPropertiesInterfaceAfterDuplicateCount) {

      // There are several objects which have additional properties, so we will introduce a common interface for them.
      const commonDictionary = OmniUtil.getCommonDenominator({features: args.features, create: CreateMode.ANY}, allDictionaries)!;

      if (!commonDictionary) {

        const dictionariesString = allDictionaries.map(it => OmniUtil.describe(it)).join('\n');
        throw new Error(`Should always be able to get some common denominator from:\n${dictionariesString}`);
      }

      if (commonDictionary.type.kind != OmniTypeKind.DICTIONARY) {
        throw new Error(`The common denominator of the pattern properties must be a map/dictionary`);
      }

      // TODO: Future improvement would be to either create different AdditionalProperties interfaces, or to create an Exclusive Union of the different key/value types.

      // The types are the same so there is no need for any generics. We can just add the same interface as-is to all declarations.
      const newInterfaceDec = this.createNonGenericDictionary(args.root, commonDictionary.type, args.options);

      for (const decId of decWithDictionary.keys()) {
        const dec = decIdToDec.get(decId);
        if (!dec) {
          throw new Error(`Could not find the class declaration with id ${decId}`);
        }

        if (dec instanceof Java.AbstractObjectDeclaration) {
          if (!dec.implements) {
            dec.implements = new Java.ImplementsDeclaration(new Java.TypeList());
          }

          dec.implements.types.children.push(newInterfaceDec.type);
        }
      }

      const nameResolver = args.root.getNameResolver();
      const resolved = nameResolver.investigate({type: newInterfaceDec.type.omniType, options: args.options});
      const namespaceString = nameResolver.build({name: resolved, with: NameParts.NAMESPACE, use: TypeUseKind.NAMESPACE_DECLARATION});

      args.root.children.push(new Java.CompilationUnit(
        new Java.PackageDeclaration(namespaceString),
        new Java.ImportList(),
        newInterfaceDec,
      ));
    }
  }

  private createNonGenericDictionary(root: RootAstNode, commonDictionary: OmniDictionaryType, options: JavaAndTargetOptions) {

    const properties: OmniProperty[] = [];
    const newInterfaceObjectType: OmniObjectType = {
      kind: OmniTypeKind.OBJECT,
      name: 'AdditionalProperties',
      properties: properties,
    };
    const newInterfaceType: OmniInterfaceType = {
      kind: OmniTypeKind.INTERFACE,
      name: 'IAdditionalProperties',
      of: newInterfaceObjectType,
    };

    properties.push({
      kind: OmniItemKind.PROPERTY,
      name: ADDITIONAL_PROPERTIES_FIELD_NAME,
      type: commonDictionary,
    });

    const newDictionaryTypeNode = root.getAstUtils().createTypeNode(commonDictionary);
    const newInterfaceTypeNode = root.getAstUtils().createTypeNode(newInterfaceType);

    const block = new Java.Block(
      new Java.Statement(this.createGetterMethodSignature(newDictionaryTypeNode, undefined, new Java.ModifierList())),
    );

    if (!options.immutable) {
      block.children.push(new Java.Statement(this.createAdderMethodSignature(
        root,
        this.createAdderMethodKeyParameter(root, commonDictionary),
        this.createAdderMethodValueParameter(root, commonDictionary),
        new Java.ModifierList(),
      )));
    }

    return new Java.InterfaceDeclaration(
      newInterfaceTypeNode,
      new Java.Identifier('IAdditionalProperties'),
      block,
    );
  }

  private propertyToDictionary(property: OmniProperty): OmniDictionaryType {

    const keyType: OmniPrimitiveType = {
      kind: OmniTypeKind.STRING,
    };

    // - A pattern property becomes a "property" with a regex name, where the type is "object"
    // - So here when we turn it into a Dictionary, we need to translate it into `any` (JsonNode for Java)
    // NOTE: This would perhaps gain from having an additional unknown kind that is "An object which contains primitives" and "An object which contains anything, including objects"
    const valueType = this.getNormalizedDictionaryValueType(property.type);

    return {
      kind: OmniTypeKind.DICTIONARY,
      keyType: keyType,
      valueType: valueType,
    };
  }

  private getNormalizedDictionaryValueType(type: OmniType): OmniType {

    if (type.kind === OmniTypeKind.UNKNOWN) {
      if (type.unknownKind === UnknownKind.DYNAMIC_OBJECT) {
        return {...type, unknownKind: UnknownKind.ANY};
      }
    }

    return type;
  }

  private createJsonAnyNode(
    root: RootAstNode,
    dictionaryType: OmniDictionaryType,
    options: JavaOptions,
  ): Java.Nodes {

    const nodes = new Java.Nodes();

    const additionalPropertiesFieldIdentifier = new Java.Identifier(ADDITIONAL_PROPERTIES_FIELD_NAME);

    const additionalPropertiesTypeNodeDec = root.getAstUtils().createTypeNode(dictionaryType, false);
    const additionalPropertiesTypeNodeImpl = root.getAstUtils().createTypeNode(dictionaryType, true);

    const additionalPropertiesField = new Java.Field(
      additionalPropertiesTypeNodeDec,
      additionalPropertiesFieldIdentifier,
      new Java.ModifierList(
        new Java.Modifier(Java.ModifierKind.PRIVATE),
      ),
      new Java.NewStatement(additionalPropertiesTypeNodeImpl),
    );

    const keyParameterDeclaration = this.createAdderMethodKeyParameter(root, dictionaryType);
    const valueParameterDeclaration = this.createAdderMethodValueParameter(root, dictionaryType);

    const adderMethod = new Java.MethodDeclaration(
      this.createAdderMethodSignature(root, keyParameterDeclaration, valueParameterDeclaration),
      new Java.Block(
        new Java.Statement(
          new Java.MethodCall(
            new Java.MemberAccess(new Java.MemberAccess(new Java.SelfReference(), new Java.FieldReference(additionalPropertiesField.id)), new Java.Identifier('put')),
            new Java.ArgumentList(
              new Java.DeclarationReference(keyParameterDeclaration),
              new Java.DeclarationReference(valueParameterDeclaration),
            ),
          ),
        ),
      ),
    );

    const getterMethod = new Java.MethodDeclaration(
      this.createGetterMethodSignature(additionalPropertiesTypeNodeDec),
      new Java.Block(
        new Java.Statement(
          new Java.ReturnStatement(
            new Java.MemberAccess(new Java.SelfReference(), new Java.FieldReference(additionalPropertiesField.id)),
          ),
        ),
      ),
    );

    if (!additionalPropertiesField.annotations) {
      additionalPropertiesField.annotations = new Java.AnnotationList();
    }

    adderMethod.signature.annotations = new Java.AnnotationList();
    getterMethod.signature.annotations = new Java.AnnotationList();

    if (options.lombokBuilder) {

      additionalPropertiesField.annotations.children.push(new Java.Annotation(
        new Java.EdgeType({
          kind: OmniTypeKind.HARDCODED_REFERENCE,
          fqn: LOMBOK_SINGULAR,
        }),
      ));
    }

    if (options.serializationLibrary === SerializationLibrary.JACKSON) {

      additionalPropertiesField.annotations.children.push(new Java.Annotation(
        new Java.EdgeType({
          kind: OmniTypeKind.HARDCODED_REFERENCE,
          fqn: JACKSON_JSON_ANY_SETTER,
        }),
      ));

      getterMethod.signature.annotations.children.push(new Java.Annotation(
        new Java.EdgeType({
          kind: OmniTypeKind.HARDCODED_REFERENCE,
          fqn: JACKSON_JSON_ANY_GETTER,
        }),
      ));
    }

    nodes.children.push(additionalPropertiesField);
    nodes.children.push(adderMethod);
    nodes.children.push(getterMethod);

    return nodes;
  }

  private createGetterMethodSignature(additionalPropertiesTypeNode: TypeNode, annotations?: Java.AnnotationList, modifiers?: Java.ModifierList) {
    return new Java.MethodDeclarationSignature(
      new Java.Identifier(METHOD_GETTER_NAME),
      additionalPropertiesTypeNode,
      undefined,
      modifiers,
      annotations,
    );
  }

  private createAdderMethodValueParameter(root: RootAstNode, dictionaryType: OmniDictionaryType) {
    const valueParameterIdentifier = new Java.Identifier('value');
    return new Java.Parameter(root.getAstUtils().createTypeNode(dictionaryType.valueType), valueParameterIdentifier);
  }

  private createAdderMethodKeyParameter(root: RootAstNode, dictionaryType: OmniDictionaryType) {
    const keyParameterIdentifier = new Java.Identifier('key');
    return new Java.Parameter(root.getAstUtils().createTypeNode(dictionaryType.keyType), keyParameterIdentifier);
  }

  private createAdderMethodSignature(root: RootAstNode, keyParameterDeclaration: Java.Parameter, valueParameterDeclaration: Java.Parameter, modifiers?: Java.ModifierList) {
    return new Java.MethodDeclarationSignature(
      new Java.Identifier(METHOD_ADDER_NAME),
      root.getAstUtils().createTypeNode({kind: OmniTypeKind.VOID} satisfies OmniPrimitiveType),
      new Java.ParameterList(
        keyParameterDeclaration,
        valueParameterDeclaration,
      ),
      modifiers,
    );
  }
}
