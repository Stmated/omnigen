import {
  AstTransformer,
  AstTransformerArguments,
  Direction,
  ObjectName, OmniGenericSourceIdentifierType, OmniGenericSourceType, OmniGenericTargetType,
  OmniHardcodedReferenceType, OmniKindPrimitive,
  OmniProperty,
  OmniPropertyName, OmniType,
  OmniTypeKind,
  OmniUnknownType, PackageOptions,
  TargetOptions, TypeNode,
  TypeUseKind,
  UnknownKind,
} from '@omnigen/api';
import {AbortVisitingWithResult, assertUnreachable, OmniUtil, Visitor} from '@omnigen/core';
import {LoggerFactory} from '@omnigen/core-log';
import {Code, CodeAstUtils, CodeOptions, SerializationPropertyNameMode} from '@omnigen/target-code';
import {CSharpOptions, SerializationLibrary} from '../options';
import {Cs} from '../ast';
import {Kinds, VirtualAnnotationKind} from '@omnigen/target-code/ast';

const logger = LoggerFactory.create(import.meta.url);

interface JsonAttribute {
  name: ObjectName | undefined;
}

interface JsonAttributes {
  JSON_PROPERTY: JsonAttribute;
  JSON_VALUE: JsonAttribute;
  JSON_CREATOR: JsonAttribute;
  JSON_INCLUDE: JsonAttribute;
  JSON_INCLUDE_PROP: JsonAttribute;
  JSON_ANY_GETTER: JsonAttribute;
  JSON_ANY_SETTER: JsonAttribute;
  JSON_SERIALIZER: JsonAttribute;
  JSON_NODE: JsonAttribute;
  JSON_OBJECT: JsonAttribute;
}

const NewtonsoftJsonAttributes: Readonly<JsonAttributes> = Object.freeze({
  JSON_PROPERTY: {name: {namespace: ['Newtonsoft', 'Json'], edgeName: {onUse: 'JsonProperty', onImport: 'JsonPropertyAttribute'}}},
  JSON_VALUE: {name: undefined}, // `JsonConverter` needed, no @JsonValue equivalent
  // JSON_VALUE: {name: {namespace: ['Newtonsoft', 'Json'], edgeName: {onUse: 'JsonProperty', onImport: 'JsonPropertyAttribute'}}}, // `JsonConverter` needed!
  JSON_CREATOR: {name: {namespace: ['Newtonsoft', 'Json'], edgeName: {onUse: 'JsonConstructor', onImport: 'JsonConstructorAttribute'}}},
  JSON_INCLUDE: {name: undefined}, // [JsonProperty(PropertyName = "property", NullValueHandling = NullValueHandling.Include)]
  JSON_INCLUDE_PROP: {name: {namespace: ['Newtonsoft', 'Json'], edgeName: 'NullValueHandling'}}, // No equivalent
  JSON_ANY_GETTER: {name: {namespace: ['Newtonsoft', 'Json'], edgeName: {onUse: 'JsonExtensionData', onImport: 'JsonExtensionDataAttribute'}}}, // No equivalent
  JSON_ANY_SETTER: {name: undefined}, // No equivalent
  JSON_SERIALIZER: {name: {namespace: ['Newtonsoft', 'Json'], edgeName: 'JsonSerializer'}}, // Method `JsonConvert.DeserializeObject<MyClass>(dto)` or `JsonConvert.SerializeObject`
  JSON_NODE: {name: {namespace: ['Newtonsoft', 'Json', 'Linq'], edgeName: 'JToken'}}, // No equivalent
  JSON_OBJECT: {name: {namespace: ['Newtonsoft', 'Json', 'Linq'], edgeName: 'JObject'}}, // No equivalent
});

const SystemJsonAttributes: Readonly<JsonAttributes> = Object.freeze({
  JSON_PROPERTY: {name: {namespace: ['System', 'Text', 'Json', 'Serialization'], edgeName: {onUse: 'JsonPropertyName', onImport: 'JsonPropertyNameAttribute'}}},
  JSON_VALUE: {name: undefined}, // `JsonConverter` needed!
  JSON_CREATOR: {name: undefined}, // Custom constructor and handle deserialization manually
  JSON_INCLUDE: {name: {namespace: ['System', 'Text', 'Json', 'Serialization'], edgeName: {onUse: 'JsonIgnore', onImport: 'JsonIgnoreAttribute'}}}, // [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
  JSON_INCLUDE_PROP: {name: undefined}, // No equivalent
  JSON_ANY_GETTER: {name: undefined}, // No equivalent
  JSON_ANY_SETTER: {name: undefined}, // No equivalent
  JSON_SERIALIZER: {name: {namespace: ['System', 'Text', 'Json'], edgeName: {onUse: 'JsonSerializer', onImport: 'JsonSerializerAttribute'}}}, // Method `JsonSerializer.Deserialize<MyClass>(dto)` or `JsonSerializer.Serialize`
  JSON_NODE: {name: undefined}, // No equivalent
  JSON_OBJECT: {name: undefined}, // No equivalent
});

/**
 * NOTE: This is a work in progress. It only supports a small subset of what is needed for full C# support.
 *
 * NOTE: This is mostly quickly copied over from the Java version of JSON-handling. Some code is never used, or not applicable or badly structured. Needs a targeted C# rewrite.
 * */
export class JsonCSharpAstTransformer implements AstTransformer<Code.CodeRootAstNode, TargetOptions & CSharpOptions> {

  transformAst(args: AstTransformerArguments<Cs.CSharpRootNode, PackageOptions & TargetOptions & CSharpOptions>): void {

    if (args.options.serializationLibrary === SerializationLibrary.NONE) {
      return;
    }

    const hasAnnotatedConstructor: boolean[] = [];

    type FieldStackEntry = { annotate: Array<Code.Field | Cs.PropertyNode>, skip: Array<Code.Field | Cs.PropertyNode> };
    const fieldsStack: FieldStackEntry[] = [];
    const objectDecStack: Code.AbstractObjectDeclaration[] = [];
    const converterStack: Array<{type?: OmniType, fieldName?: Cs.PropertyIdentifier | Code.Identifier}> = [];

    const delegateToObjectMapperNode = new Map<number, Code.TypeNode>();

    const attributes: JsonAttributes = (args.options.serializationLibrary === SerializationLibrary.NEWTONSOFT) ? NewtonsoftJsonAttributes : SystemJsonAttributes;

    const defaultVisitor = args.root.createVisitor();
    const visitor = Visitor.create(defaultVisitor, {

      visitObjectDeclaration: (node, visitor) => {

        try {
          objectDecStack.push(node);
          hasAnnotatedConstructor.push(false);
          fieldsStack.push({annotate: [], skip: []});
          converterStack.push({});
          return defaultVisitor.visitObjectDeclaration(node, visitor);
        } finally {

          objectDecStack.pop();
          const converter = converterStack.pop();

          if (converter && converter.fieldName) {

            if (!node.annotations) {
              node.annotations = new Code.AnnotationList();
            }

            // This will create a reference to class `WrapperConverter` of the same namespace as the object.
            // TODO: This class will of course not exists, so we need to add code that generates this class, or just expect the end-user to create their version of it.
            const namespace = args.root.getNameResolver().parseNamespace(args.options.package);
            const converterTypeNode = new Code.GenericType(
              node.omniType,
              new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: namespace, edgeName: `WrapperConverter`}}),
              [node.type],
            );

            node.annotations.children.push(new Code.Annotation(
              new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['Newtonsoft', 'Json'], edgeName: {onUse: 'JsonConverter', onImport: 'JsonConverterAttribute'}}}),
              new Code.AnnotationKeyValuePairList(
                new Code.AnnotationKeyValuePair(
                  undefined,
                  new Code.MethodCall(
                    new Code.HardCoded('typeof'),
                    new Code.ArgumentList(converterTypeNode),
                  ),
                ),
                new Code.AnnotationKeyValuePair(
                  undefined,
                  new Code.Literal(converter.fieldName, OmniKindPrimitive.STRING),
                ),
              ),
            ));
          }

          // Need to do this *after* the object declaration has been visited.
          // Otherwise we will not have had time to find the constructor, or other influencing members.
          const entry = fieldsStack.pop();
          if (entry && !hasAnnotatedConstructor[hasAnnotatedConstructor.length - 1]) {

            for (const toAnnotate of entry.annotate) {
              if (!toAnnotate.property || entry.skip.includes(toAnnotate)) {
                continue;
              }

              if (toAnnotate instanceof Cs.PropertyNode) {
                // if (!this.shouldAddJsonPropertyAnnotation(toAnnotate.identifier.value, toAnnotate.property.name, args.options)) {
                //   continue;
                // }

                const annotations = toAnnotate.annotations || new Code.AnnotationList(...[]);
                annotations.children.push(...JsonCSharpAstTransformer.createJacksonAnnotations(attributes, toAnnotate.identifier, toAnnotate.property, Direction.BOTH, args.options, false));
                if (!toAnnotate.annotations && annotations.children.length > 0) {
                  toAnnotate.annotations = annotations;
                }
              } else if (toAnnotate instanceof Cs.Field) {

                // if (!this.shouldAddJsonPropertyAnnotation(toAnnotate.identifier.value, toAnnotate.property.name, args.options)) {
                //   continue;
                // }

                const annotations = toAnnotate.annotations || new Code.AnnotationList(...[]);
                annotations.children.push(...JsonCSharpAstTransformer.createJacksonAnnotations(attributes, toAnnotate.identifier, toAnnotate.property, Direction.BOTH, args.options, false));
                if (!toAnnotate.annotations && annotations.children.length > 0) {
                  toAnnotate.annotations = annotations;
                }
              }
            }
          }

          hasAnnotatedConstructor.pop();
        }
      },

      visitField: n => {

        if (n.modifiers.children.some(it => it.kind == Cs.ModifierKind.PRIVATE)) {

          // If the field is private, then it should be skipped. If it is supposed to be included, then it will have a property accessor by now.
          // NOTE: Perhaps make this clear by adding an Ignore attribute?
          return;
        }

        // A JsonValue field should not have any JsonProperty added to it.
        // const annotations = ;
        const jsonValueAnnotation = this.getJsonValueAnnotation(n.annotations, attributes);

        if (!jsonValueAnnotation) {
          if (this.shouldAddJsonPropertyAnnotation(n.identifier.value, n.identifier.original, args.options)) {
            fieldsStack[fieldsStack.length - 1].annotate.push(n);
          }
        } else {

          // The field has a "JsonValue" attribute, so we should register it and add a `JsonConverter` to the class to properly serialize/deserialize.
          const converter = converterStack[converterStack.length - 1];
          converter.fieldName = n.identifier;
          converter.type = n.type.omniType;
        }
      },

      visitProperty: n => {

        const jsonValueAnnotation = this.getJsonValueAnnotation(n.annotations, attributes);

        if (!jsonValueAnnotation) { // } && this.shouldAddJsonPropertyAnnotation(n.identifier.identifier.value, n.property?.name, args.options)) {
          fieldsStack[fieldsStack.length - 1].annotate.push(n);
        } else {
          const converter = converterStack[converterStack.length - 1];
          converter.fieldName = n.identifier;
          converter.type = n.type.omniType;
        }

        return n;
      },

      visitMethodDeclaration: (n, v) => {

        // Figure out if method is a getter, and if it is, then add the attribute there -- irregardless if constructor already adds one (until we can separate "client" vs "server")
        const getterField = CodeAstUtils.getGetterField(args.root, n);

        if (getterField && getterField.property) {

          const annotations = n.signature.annotations || new Code.AnnotationList(...[]);

          if (this.shouldAddJsonPropertyAnnotation(getterField.identifier.value, getterField.property.name, args.options)) {
            annotations.children.push(...JsonCSharpAstTransformer.createJacksonAnnotations(attributes, getterField.identifier, getterField.property, Direction.OUT, args.options, true));
            fieldsStack[fieldsStack.length - 1].skip.push(getterField);
          }

          if (!n.signature.annotations) {
            n.signature.annotations = annotations;
          }
        }

        return defaultVisitor.visitMethodDeclaration(n, v);
      },

      visitConstructor: node => {

        const owner = objectDecStack[objectDecStack.length - 1];
        this.addAnnotationsToConstructor(node, owner, args, hasAnnotatedConstructor);
      },

      visitDelegate: n => {

        if (n.kind === Code.DelegateKind.CONVERTER && n.returnType && n.parameterTypes.length == 1 && this.isJacksonNodeType(attributes, n.parameterTypes[0], args.options)) {

          if (attributes.JSON_SERIALIZER.name) {
            const mapperTypeNode = new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JSON_SERIALIZER.name});
            delegateToObjectMapperNode.set(n.id, mapperTypeNode);
          }
        }
      },
    });

    args.root.visit(visitor);

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceWildcardType: (n, r) => {

        const converted = this.wildcardToJsonType(attributes, n.omniType, args.options);
        if (converted) {
          return new Code.EdgeType(converted, n.implementation);
        }

        return defaultReducer.reduceWildcardType(n, r);
      },
      reduceEdgeType: (n, r) => {

        if (n.omniType.kind == OmniTypeKind.DICTIONARY) {

          // Check key and value and make the appropriate decision for what Jackson type might be the best one!
          const type = n.omniType;

          if (type.keyType.kind == OmniTypeKind.STRING) {
            const nodeName = attributes.JSON_NODE.name;
            if (type.valueType.kind == OmniTypeKind.UNKNOWN || (type.valueType.kind == OmniTypeKind.HARDCODED_REFERENCE && OmniUtil.isEqualObjectName(type.valueType.fqn, nodeName))) {
              return args.root.getAstUtils().createTypeNode(type, n.implementation).reduce(r);
            }
          }
        }

        return defaultReducer.reduceEdgeType(n, r);
      },
      reduceVirtualAnnotationNode: n => {

        if (n.value.kind === Code.VirtualAnnotationKind.SERIALIZATION_VALUE) {
          if (attributes.JSON_VALUE.name) {
            return new Code.Annotation(
              new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JSON_VALUE.name}),
            );
          } else {
            return undefined;
          }
        }

        if (n.value.kind === Code.VirtualAnnotationKind.DESERIALIZATION_CREATOR) {
          if (attributes.JSON_CREATOR.name) {
            return new Code.Annotation(
              new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JSON_CREATOR.name}),
            );
          } else {
            return undefined;
          }
        }

        return n;
      },

      reduceDelegate: n => {

        const replacement = delegateToObjectMapperNode.get(n.id);
        if (replacement) {
          return replacement;
        }

        return n;
      },
      reduceDelegateCall: n => {

        const replacement = delegateToObjectMapperNode.get(n.delegateRef.targetId);
        if (replacement) {

          const delegate = args.root.resolveNodeRef(n.delegateRef);

          return new Code.MethodCall(
            new Code.MemberAccess(n.args.children[0], new Code.Identifier('ToObject')),
            new Code.ArgumentList(n.target),
            new Code.ArgumentList(new Code.ClassName(delegate.returnType)),
          );
        }

        return n;
      },

      reduceEnumDeclaration: (n, r) => {

        if (n.type.omniType.itemKind === OmniTypeKind.STRING) {

          if (!n.annotations) {
            n.annotations = new Cs.AnnotationList();
          }

          n.annotations.children.push(new Cs.Annotation(
            new Cs.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['Newtonsoft', 'Json'], edgeName: {onUse: 'JsonConverter', onImport: 'JsonConverterAttribute'}}}),
            new Cs.AnnotationKeyValuePairList(
              new Cs.AnnotationKeyValuePair(
                undefined,
                new Cs.MethodCall(
                  new Cs.HardCoded('typeof'),
                  new Cs.ArgumentList(
                    new Cs.ClassName(new Cs.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['Newtonsoft', 'Json', 'Converters'], edgeName: 'StringEnumConverter'}})),
                  ),
                ),
              ),
            ),
          ));
        }

        return defaultReducer.reduceEnumDeclaration(n, r);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  private getJsonValueAnnotation(annotations: Code.AnnotationList | undefined, attributes: JsonAttributes) {
    return annotations?.children.find(
      it => {
        if (it instanceof Code.Annotation) {
          return (it.type.omniType.kind === OmniTypeKind.HARDCODED_REFERENCE) && OmniUtil.isEqualObjectName(it.type.omniType.fqn, attributes.JSON_VALUE.name);
        } else {
          return it.value.kind === VirtualAnnotationKind.SERIALIZATION_VALUE;
        }
      },
    );
  }

  private wildcardToJsonType(attributes: JsonAttributes, n: OmniUnknownType, options: CSharpOptions): OmniHardcodedReferenceType | undefined {

    const unknownKind = n.unknownKind ?? options.unknownType;
    if (unknownKind === UnknownKind.DYNAMIC_OBJECT && attributes.JSON_OBJECT.name) {
      // Maybe JObject
      return {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JSON_OBJECT.name};
    } else if ((unknownKind === UnknownKind.ANY || unknownKind === UnknownKind.DYNAMIC) && attributes.JSON_NODE.name) {
      // Maybe JToken
      // TODO: There should be another `unknownKind` to differentiate between `dynamic` and `JToken` since they have different use-cases
      return {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JSON_NODE.name};
    }

    return undefined;
  }

  private isJacksonNodeType(attributes: JsonAttributes, n: Code.TypeNode, options: CSharpOptions): boolean {

    if (n.omniType.kind === OmniTypeKind.HARDCODED_REFERENCE) {
      // Either it already is a Jackson node.
      if (OmniUtil.isEqualNamespace(n.omniType.fqn.namespace, ['com', 'fasterxml', 'jackson', 'databind'])) {
        return true;
      }
    } else if (n.omniType.kind === OmniTypeKind.UNKNOWN) {

      // Or it is one that will be converted by this transformer later by a reducer.
      const asJackson = this.wildcardToJsonType(attributes, n.omniType, options);
      if (asJackson) {
        return true;
      }
    }

    return false;
  }

  private addAnnotationsToConstructor(
    node: Code.ConstructorDeclaration,
    owner: Code.AbstractObjectDeclaration,
    args: AstTransformerArguments<Code.CodeRootAstNode, TargetOptions & CSharpOptions>,
    hasAnnotatedConstructor: boolean[],
  ) {

    const ownerType = owner.type.omniType;
    if (ownerType.kind == OmniTypeKind.OBJECT && ownerType.abstract) {

      // We do not add any annotations to an abstract class constructor, since they will be overridden anyway.
      return;
    }

    const annotations = node.annotations || new Code.AnnotationList(...[]);

    let hasJsonValue = false;

    const defaultBooleanVisitor = args.root.createVisitor<boolean>();
    const jsonValueVisitor = Visitor.create(defaultBooleanVisitor, {
      visitVirtualAnnotationNode: n => {
        if (n.value.kind === Code.VirtualAnnotationKind.SERIALIZATION_VALUE) {
          hasJsonValue = true;
        } else if (n.value.kind === Code.VirtualAnnotationKind.DESERIALIZATION_CREATOR) {
          throw new AbortVisitingWithResult(true); // Abort right away
        }
      },
      visitObjectDeclaration: () => {
      },
      visitClassDeclaration: () => {
      },
      visitInterfaceDeclaration: () => {
      },
    });

    // const constructorAnnotationMode = args.options.serializationConstructorAnnotationMode;
    // const hasJsonCreator = VisitResultFlattener.visitWithSingularResult(jsonValueVisitor, owner.body, false);
    // if (!hasJsonCreator) {
    //   if (constructorAnnotationMode == Code.SerializationConstructorAnnotationMode.ALWAYS) {
    //     annotations.children.push(new Code.Annotation(new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_CREATOR})));
    //   } else if (constructorAnnotationMode == Code.SerializationConstructorAnnotationMode.IF_REQUIRED) {
    //
    //     // TODO: IF_REQUIRED might be needed if there are multiple constructors. But right now there are only ever one constructor.
    //
    //     if ((!node.parameters || node.parameters.children.length <= 1) && hasJsonValue) {
    //       annotations.children.push(new Code.Annotation(new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_CREATOR})));
    //     }
    //   }
    // }
    //
    // if (node.parameters && (constructorAnnotationMode == Code.SerializationConstructorAnnotationMode.ALWAYS || constructorAnnotationMode == Code.SerializationConstructorAnnotationMode.IF_REQUIRED)) {
    //
    //   for (const parameter of node.parameters.children) {
    //
    //     const resolved = args.root.resolveNodeRef(parameter.ref);
    //     const field = (resolved instanceof Code.Field) ? resolved : undefined;
    //     if (!field) {
    //       continue;
    //     }
    //
    //     const property = field.property;
    //     if (!property) {
    //       continue;
    //     }
    //
    //     const parameterAnnotations = parameter.annotations || new Code.AnnotationList();
    //
    //     if (this.shouldAddJsonPropertyAnnotation(parameter.identifier.value, property.name, args.options)) {
    //       hasAnnotatedConstructor[hasAnnotatedConstructor.length - 1] = true;
    //       parameterAnnotations.children.push(...JsonCSharpAstTransformer.createJacksonAnnotations(field.identifier.value, property, Direction.IN, args.options, false));
    //     }
    //
    //     if (!parameter.annotations && parameterAnnotations.children.length > 0) {
    //       parameter.annotations = parameterAnnotations;
    //     }
    //   }
    // }

    if (!node.annotations && annotations.children.length > 0) {
      node.annotations = annotations;
    }
  }

  private static createJacksonAnnotations(
    attributes: JsonAttributes,
    fieldIdentifier: Cs.Identifier | Cs.PropertyIdentifier | Cs.GetterIdentifier,
    property: OmniProperty,
    direction: Direction,
    targetOptions: TargetOptions & CSharpOptions,
    requiresName: boolean,
  ): Code.Annotation[] {

    const annotations: Code.Annotation[] = [];

    const jsonProperty = JsonCSharpAstTransformer.createPropertyAnnotations(attributes, property, direction, requiresName, targetOptions);
    if (jsonProperty.length > 0) {
      annotations.push(...jsonProperty);
    }

    if (OmniUtil.getPropertyNamePattern(property.name)) {

      // This is a pattern property, and the only support for this at the moment is to add the "ExtensionData" attribute.
      if (attributes.JSON_ANY_GETTER.name) {

        const jsonInclude = new Code.Annotation(
          new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JSON_ANY_GETTER.name}),
        );

        annotations.push(jsonInclude);
      }
    }

    if (targetOptions.serializationEnsureRequiredFieldExistence) {
      if (property.required && (direction == Direction.BOTH || direction == Direction.OUT) && attributes.JSON_INCLUDE.name && attributes.JSON_INCLUDE_PROP.name) {

        annotations.push(new Code.Annotation(
          new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JSON_INCLUDE.name}),
          new Code.AnnotationKeyValuePairList(
            new Code.AnnotationKeyValuePair(
              undefined,
              new Code.StaticMemberReference(
                new Code.ClassName(new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JSON_INCLUDE_PROP.name})),
                new Code.Identifier('ALWAYS'),
              ),
            ),
          ),
        ));
      }
    }

    return annotations;
  }

  private static createPropertyAnnotations(
    attributes: JsonAttributes,
    property: OmniProperty,
    direction: Direction,
    requiresName: boolean,
    options: TargetOptions & CodeOptions,
  ): Code.Annotation[] {

    const annotations: Code.Annotation[] = [];

    // TODO: This attribute should be added by another transformer, one that deals with general C# and not with JSON
    if (property.required) {
      annotations.push(new Code.Annotation(
        new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['System', 'ComponentModel', 'DataAnnotations'], edgeName: {onUse: 'Required', onImport: 'RequiredAttribute'}}}),
        // new Code.AnnotationKeyValuePairList(
        //   new Code.AnnotationKeyValuePair(
        //     new Code.Identifier('ErrorMessage'),
        //     new Code.Literal(`${OmniUtil.getPropertyName(property.name, true)} is required`, OmniTypeKind.STRING),
        //   ),
        // ),
      ));
    }

    const annotationArguments = new Code.AnnotationKeyValuePairList();
    const resolvedPropertyName = OmniUtil.getPropertyName(property.name);
    if (resolvedPropertyName) { // direction != Direction.OUT || direction == Direction.OUT) {

      // NOTE: Perhaps if this is undefined (name is a regex), then we should add some other annotation?
      // if (resolvedPropertyName) {
      annotationArguments.children.push(new Code.AnnotationKeyValuePair(undefined, new Code.Literal(resolvedPropertyName)));
      // }
    } else if (requiresName) {
      return annotations;
    }

    if (property.required && !OmniUtil.hasSpecifiedConstantValue(property.type)) {
      annotationArguments.children.push(new Code.AnnotationKeyValuePair(
        new Code.Identifier('Required'),
        new Code.StaticMemberReference(
          new Code.ClassName(
            new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: {namespace: ['Newtonsoft', 'Json'], edgeName: 'Required'}}),
          ),
          new Code.Identifier('Always'),
        )));
    }

    if (options.serializationEnsureRequiredFieldExistence) {
      if (property.required && (direction == Direction.BOTH || direction == Direction.OUT) && attributes.JSON_INCLUDE_PROP.name) {
        annotationArguments.children.push(new Code.AnnotationKeyValuePair(
          new Code.Identifier(OmniUtil.resolveObjectEdgeName(attributes.JSON_INCLUDE_PROP.name.edgeName, TypeUseKind.CONCRETE)),
          new Code.StaticMemberReference(
            new Code.ClassName(new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JSON_INCLUDE_PROP.name})),
            new Code.Identifier('Include'),
          ),
        ));
      }
    }

    if (annotationArguments.children.length > 0 && attributes.JSON_PROPERTY.name) {

      annotations.push(new Code.Annotation(
        new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JSON_PROPERTY.name}),
        annotationArguments,
      ));
    }

    return annotations;
  }

  private shouldAddJsonPropertyAnnotation(sourceCodeName: string | undefined, propertyName: OmniPropertyName | undefined, targetOptions: CSharpOptions) {

    if (targetOptions.serializationPropertyNameMode == SerializationPropertyNameMode.ALWAYS) {
      return true;
    } else if (targetOptions.serializationPropertyNameMode == SerializationPropertyNameMode.IF_REQUIRED) {

      const resolvedPropertyName = propertyName ? OmniUtil.getPropertyName(propertyName) : undefined;
      return (sourceCodeName ?? resolvedPropertyName) != (resolvedPropertyName ?? sourceCodeName);

    } else if (targetOptions.serializationPropertyNameMode == SerializationPropertyNameMode.SKIP) {
      return false;
    }

    assertUnreachable(targetOptions.serializationPropertyNameMode);
  }
}
