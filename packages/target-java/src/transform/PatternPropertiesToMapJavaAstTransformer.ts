import {AbstractJavaAstTransformer, JavaAndTargetOptions, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {CommonDenominatorType, OmniDictionaryType, OmniInterfaceType, OmniObjectType, OmniPrimitiveType, OmniProperty, OmniTypeKind} from '@omnigen/core';
import * as Java from '../ast';
import {OmniUtil} from '@omnigen/core-util';
import {JavaOptions, SerializationLibrary} from '../options';
import {JavaAstUtils} from './JavaAstUtils.ts';
import {JACKSON_JSON_ANY_GETTER, JACKSON_JSON_ANY_SETTER} from './JacksonJavaAstTransformer.ts';
import {JavaUtil} from '../util';

const METHOD_GETTER_NAME = 'getAdditionalProperties';
const METHOD_ADDER_NAME = 'addAdditionalProperty';

export class PatternPropertiesToMapJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const replacedProperties = new Map<OmniProperty, Java.Nodes>();
    const replacedFieldIds: number[] = [];
    const classDeclarationStack: Java.ClassDeclaration[] = [];
    const decWithDictionary = new Map<number, OmniDictionaryType[]>();
    const decIdToDec = new Map<number, Java.ClassDeclaration>();
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
          const decId = dec.id;
          (decWithDictionary.has(decId) ? decWithDictionary : decWithDictionary.set(decId, [])).get(decId)!.push(dictionaryType);
          allDictionaries.push(dictionaryType);

          // Replace with something else
          const replacingNodes = this.createJsonAnyNode(dictionaryType, args.options);

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
      reduceField: (n, r) => {
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
      const commonDictionary = OmniUtil.getCommonDenominator({features: args.features, create: true}, ...allDictionaries)!;
      const commonKey = OmniUtil.getCommonDenominator(args.features, ...allDictionaries.map(it => it.keyType));
      const commonValue = OmniUtil.getCommonDenominator(args.features, ...allDictionaries.map(it => it.valueType));

      // const commonDenominator = OmniUtil.getCommonDenominator(args.features, ...dictionaryTypes);
      if (!commonDictionary || !commonKey || !commonValue) {
        throw new Error(`Should always be able to get some common denominator`);
      }

      const commonDictionaryType = commonDictionary.type;

      if (commonDictionaryType.kind != OmniTypeKind.DICTIONARY) {
        throw new Error(`The common denominator of the pattern properties must be a map/dictionary`);
      }

      if (!commonDictionary.diffs || OmniUtil.getDiffAmount(commonDictionary.diffs) === 0) {

        // The types are the same so there is no need for any generics. We can just add the same interface as-is to all declarations.
        const newInterfaceDec = this.createNonGenericDictionary(commonDictionaryType, args.options);

        for (const decId of decWithDictionary.keys()) {
          const dec = decIdToDec.get(decId);
          if (!dec) {
            throw new Error(`Could not find the class declaration with id ${decId}`);
          }

          if (!dec.implements) {
            dec.implements = new Java.ImplementsDeclaration(new Java.TypeList([]));
          }

          dec.implements.types.children.push(newInterfaceDec.type);
        }

        const typeName = JavaUtil.getClassName(newInterfaceDec.type.omniType, args.options);
        const packageName = JavaUtil.getPackageName(newInterfaceDec.type.omniType, typeName, args.options);

        args.root.children.push(new Java.CompilationUnit(
          new Java.PackageDeclaration(packageName),
          new Java.ImportList([]),
          newInterfaceDec,
        ));

      } else {

        throw new Error(`Implement!`);

      }
    }
  }

  private createGenericDictionary(commonDictionary: CommonDenominatorType) {

  }

  private createNonGenericDictionary(commonDictionary: OmniDictionaryType, options: JavaAndTargetOptions) {

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
      name: 'additionalProperties',
      type: commonDictionary,
      owner: newInterfaceObjectType,
    });

    const newDictionaryTypeNode = JavaAstUtils.createTypeNode(commonDictionary);
    const newInterfaceTypeNode = JavaAstUtils.createTypeNode(newInterfaceType);

    const block = new Java.Block(
      new Java.Statement(this.createGetterMethodSignature(newDictionaryTypeNode)),
    );

    if (!options.immutableModels) {
      block.children.push(new Java.Statement(this.createAdderMethodSignature(
        this.createAdderMethodKeyParameter(commonDictionary),
        this.createAdderMethodValueParameter(commonDictionary),
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

    return {
      kind: OmniTypeKind.DICTIONARY,
      keyType: keyType,
      valueType: property.type,
    };
  }

  private createJsonAnyNode(
    dictionaryType: OmniDictionaryType,
    options: JavaOptions,
  ): Java.Nodes {

    // TODO: Need to do something else than Block, something which can be replaced/flattened by a later transformer.
    const nodes = new Java.Nodes();

    // TODO: This should be some other type. Point directly to Map<String, Object>? Or have specific known type?

    const additionalPropertiesFieldIdentifier = new Java.Identifier('_additionalProperties');

    const additionalPropertiesTypeNode = this.createAdditionalPropertiesTypeNode(dictionaryType);
    const additionalPropertiesField = new Java.Field(
      additionalPropertiesTypeNode,
      additionalPropertiesFieldIdentifier,
      new Java.ModifierList(
        new Java.Modifier(Java.ModifierType.PRIVATE),
        new Java.Modifier(Java.ModifierType.FINAL),
      ),
      new Java.NewStatement(JavaAstUtils.createTypeNode(dictionaryType, true)),
    );

    const keyParameterDeclaration = this.createAdderMethodKeyParameter(dictionaryType);
    const valueParameterDeclaration = this.createAdderMethodValueParameter(dictionaryType);

    const adderMethod = new Java.MethodDeclaration(
      this.createAdderMethodSignature(keyParameterDeclaration, valueParameterDeclaration),
      new Java.Block(
        new Java.Statement(
          new Java.MethodCall(
            new Java.FieldReference(additionalPropertiesField.id),
            new Java.Identifier('put'),
            new Java.ArgumentList(
              new Java.DeclarationReference(keyParameterDeclaration),
              new Java.DeclarationReference(valueParameterDeclaration),
            ),
          ),
        ),
      ),
    );

    adderMethod.signature.annotations = new Java.AnnotationList();

    if (options.serializationLibrary == SerializationLibrary.JACKSON) {
      adderMethod.signature.annotations.children.push(new Java.Annotation(
        new Java.EdgeType({
          kind: OmniTypeKind.HARDCODED_REFERENCE,
          fqn: JACKSON_JSON_ANY_SETTER,
        }),
      ));
    }

    const getterAnnotations = new Java.AnnotationList();
    const getterMethod = new Java.MethodDeclaration(
      this.createGetterMethodSignature(additionalPropertiesTypeNode, getterAnnotations),
      new Java.Block(
        new Java.Statement(
          new Java.ReturnStatement(
            new Java.FieldReference(additionalPropertiesField.id),
          ),
        ),
      ),
    );

    if (options.serializationLibrary == SerializationLibrary.JACKSON) {

      // NOTE: This should not be on a field. But should be moved by later transformers.
      getterAnnotations.children.push(new Java.Annotation(
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

  private createAdditionalPropertiesTypeNode(dictionaryType: OmniDictionaryType) {
    return JavaAstUtils.createTypeNode(dictionaryType, false);
  }

  private createGetterMethodSignature(additionalPropertiesTypeNode: Java.TypeNode, getterAnnotations?: Java.AnnotationList) {
    return new Java.MethodDeclarationSignature(
      new Java.Identifier(METHOD_GETTER_NAME),
      additionalPropertiesTypeNode,
      undefined,
      undefined,
      getterAnnotations,
    );
  }

  private createAdderMethodValueParameter(dictionaryType: OmniDictionaryType) {
    const valueParameterIdentifier = new Java.Identifier('value');
    return new Java.Parameter(JavaAstUtils.createTypeNode(dictionaryType.valueType), valueParameterIdentifier);
  }

  private createAdderMethodKeyParameter(dictionaryType: OmniDictionaryType) {
    const keyParameterIdentifier = new Java.Identifier('key');
    return new Java.Parameter(JavaAstUtils.createTypeNode(dictionaryType.keyType), keyParameterIdentifier);
  }

  private createAdderMethodSignature(keyParameterDeclaration: Java.Parameter, valueParameterDeclaration: Java.Parameter) {
    return new Java.MethodDeclarationSignature(
      new Java.Identifier(METHOD_ADDER_NAME),
      JavaAstUtils.createTypeNode({
        kind: OmniTypeKind.VOID,
      } satisfies OmniPrimitiveType),
      new Java.ParameterList(
        keyParameterDeclaration,
        valueParameterDeclaration,
      ),
    );
  }
}
