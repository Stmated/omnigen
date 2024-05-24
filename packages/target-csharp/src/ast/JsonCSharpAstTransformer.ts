import {
  AstTransformer,
  AstTransformerArguments,
  Direction,
  ObjectName,
  OmniHardcodedReferenceType,
  OmniProperty,
  OmniPropertyName,
  OmniTypeKind,
  OmniUnknownType,
  TargetOptions,
  UnknownKind,
} from '@omnigen/core';
import {AbortVisitingWithResult, assertDefined, assertUnreachable, OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
import {LoggerFactory} from '@omnigen/core-log';
import {Code, CodeAstUtils, SerializationPropertyNameMode} from '@omnigen/target-code';
import {CSharpOptions, SerializationLibrary} from '../options';
import {Cs} from '../ast';

const logger = LoggerFactory.create(import.meta.url);

// TODO: Need to be able to give different class names depending on usage!!! Like with C# `FooAttribute` when importing and `Foo` when used!

interface JsonAttribute {
  name: ObjectName | undefined;
}

interface JsonAttributes {
  JACKSON_JSON_PROPERTY: JsonAttribute;
  JACKSON_JSON_VALUE: JsonAttribute;
  JACKSON_JSON_CREATOR: JsonAttribute;
  JACKSON_JSON_INCLUDE: JsonAttribute;
  JACKSON_JSON_INCLUDE_PROP: JsonAttribute;
  JACKSON_JSON_ANY_GETTER: JsonAttribute;
  JACKSON_JSON_ANY_SETTER: JsonAttribute;
  JACKSON_OBJECT_MAPPER: JsonAttribute;
  JACKSON_JSON_NODE: JsonAttribute;
  JACKSON_JSON_OBJECT: JsonAttribute;
}

const NewtonsoftJsonAttributes: Readonly<JsonAttributes> = Object.freeze({
  JACKSON_JSON_PROPERTY: {name: {namespace: ['Newtonsoft', 'Json'], edgeName: {onUse: 'JsonProperty', onImport: 'JsonPropertyAttribute'}}},
  JACKSON_JSON_VALUE: {name: undefined}, // `JsonConverter` needed!
  JACKSON_JSON_CREATOR: {name: {namespace: ['Newtonsoft', 'Json'], edgeName: {onUse: 'JsonConstructor', onImport: 'JsonConstructorAttribute'}}},
  JACKSON_JSON_INCLUDE: {name: {namespace: ['Newtonsoft', 'Json'], edgeName: {onUse: 'JsonProperty', onImport: 'JsonPropertyAttribute'}}}, // [JsonProperty(PropertyName = "property", NullValueHandling = NullValueHandling.Include)]
  JACKSON_JSON_INCLUDE_PROP: {name: undefined}, // No equivalent
  JACKSON_JSON_ANY_GETTER: {name: undefined}, // No equivalent
  JACKSON_JSON_ANY_SETTER: {name: undefined}, // No equivalent
  JACKSON_OBJECT_MAPPER: {name: {namespace: ['Newtonsoft', 'Json'], edgeName: 'JsonConvert'}}, // Method `JsonConvert.DeserializeObject<MyClass>(dto)` or `JsonConvert.SerializeObject`
  JACKSON_JSON_NODE: {name: undefined}, // No equivalent
  JACKSON_JSON_OBJECT: {name: undefined}, // No equivalent
});
// Newtonsoft.Json.JsonIgnoreAttribute

const SystemJsonAttributes: Readonly<JsonAttributes> = Object.freeze({
  JACKSON_JSON_PROPERTY: {name: {namespace: ['System', 'Text', 'Json', 'Serialization'], edgeName: {onUse: 'JsonPropertyName', onImport: 'JsonPropertyNameAttribute'}}},
  JACKSON_JSON_VALUE: {name: undefined}, // `JsonConverter` needed!
  JACKSON_JSON_CREATOR: {name: undefined}, // Custom constructor and handle deserialization manually
  JACKSON_JSON_INCLUDE: {name: {namespace: ['System', 'Text', 'Json', 'Serialization'], edgeName: {onUse: 'JsonIgnore', onImport: 'JsonIgnoreAttribute'}}}, // [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
  JACKSON_JSON_INCLUDE_PROP: {name: undefined}, // No equivalent
  JACKSON_JSON_ANY_GETTER: {name: undefined}, // No equivalent
  JACKSON_JSON_ANY_SETTER: {name: undefined}, // No equivalent
  JACKSON_OBJECT_MAPPER: {name: {namespace: ['System', 'Text', 'Json'], edgeName: {onUse: 'JsonSerializer', onImport: 'JsonSerializerAttribute'}}}, // Method `JsonSerializer.Deserialize<MyClass>(dto)` or `JsonSerializer.Serialize`
  JACKSON_JSON_NODE: {name: undefined}, // No equivalent
  JACKSON_JSON_OBJECT: {name: undefined}, // No equivalent
});

const JsonAttributesArray: Readonly<JsonAttributes>[] = [NewtonsoftJsonAttributes, SystemJsonAttributes];

// const JACKSON_JSON_PROPERTY = 'com.fasterxml.jackson.annotation.JsonProperty';
// const JACKSON_JSON_VALUE = 'com.fasterxml.jackson.annotation.JsonValue';
// const JACKSON_JSON_CREATOR = 'com.fasterxml.jackson.annotation.JsonCreator';
// const JACKSON_JSON_INCLUDE = 'com.fasterxml.jackson.annotation.JsonInclude';
// const JACKSON_JSON_ANY_GETTER = 'com.fasterxml.jackson.annotation.JsonAnyGetter';
// const JACKSON_JSON_ANY_SETTER = 'com.fasterxml.jackson.annotation.JsonAnySetter';
// const JACKSON_JSON_NODE = 'com.fasterxml.jackson.databind.JsonNode';
// const JACKSON_JSON_OBJECT = 'com.fasterxml.jackson.databind.node.ObjectNode';
// const JACKSON_JSON_NODE_FACTORY = 'com.fasterxml.jackson.databind.node.JsonNodeFactory';
// const JACKSON_OBJECT_MAPPER = 'com.fasterxml.jackson.databind.ObjectMapper';

/**
 * NOTE: This and `JacksonJavaAstTransformer` could probably be moved into `target-code` and annotations made into `VirtualAnnotation`
 */
export class JsonCSharpAstTransformer implements AstTransformer<Code.CodeRootAstNode, TargetOptions & CSharpOptions> {

  transformAst(args: AstTransformerArguments<Cs.CSharpRootNode, TargetOptions & CSharpOptions>): void {

    if (args.options.serializationLibrary === SerializationLibrary.NONE) {
      return;
    }

    const hasAnnotatedConstructor: boolean[] = [];

    type FieldStackEntry = { annotate: Array<Code.Field | Cs.PropertyNode>, skip: Array<Code.Field | Cs.PropertyNode> };
    const fieldsStack: FieldStackEntry[] = [];
    const objectDecStack: Code.AbstractObjectDeclaration[] = [];

    const delegateToObjectMapperNode = new Map<number, Code.TypeNode>();

    const attributes: JsonAttributes = NewtonsoftJsonAttributes;

    const defaultVisitor = args.root.createVisitor();
    const visitor = VisitorFactoryManager.create(defaultVisitor, {

      visitObjectDeclaration: (node, visitor) => {

        try {
          objectDecStack.push(node);
          hasAnnotatedConstructor.push(false);
          fieldsStack.push({annotate: [], skip: []});
          return defaultVisitor.visitObjectDeclaration(node, visitor);
        } finally {

          objectDecStack.pop();

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
                annotations.children.push(...JsonCSharpAstTransformer.createJacksonAnnotations(attributes, toAnnotate.identifier.identifier.value, toAnnotate.property, Direction.BOTH, args.options, false));
                if (!toAnnotate.annotations && annotations.children.length > 0) {
                  toAnnotate.annotations = annotations;
                }
              } else if (toAnnotate instanceof Cs.Field) {

                // if (!this.shouldAddJsonPropertyAnnotation(toAnnotate.identifier.value, toAnnotate.property.name, args.options)) {
                //   continue;
                // }

                const annotations = toAnnotate.annotations || new Code.AnnotationList(...[]);
                annotations.children.push(...JsonCSharpAstTransformer.createJacksonAnnotations(attributes, toAnnotate.identifier.value, toAnnotate.property, Direction.BOTH, args.options, false));
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

        if (n.modifiers.children.some(it => it.type == Cs.ModifierType.PRIVATE)) {

          // If the field is private, then it should be skipped. If it is supposed to be included, then it will have a property accessor by now.
          // NOTE: Perhaps make this clear by adding an Ignore attribute?
          return;
        }

        // A JsonValue field should not have any JsonProperty added to it.
        const jsonValueAnnotation = n.annotations?.children.find(
          it => (it instanceof Code.Annotation) && (it.type.omniType.kind == OmniTypeKind.HARDCODED_REFERENCE) && OmniUtil.isEqualObjectName(it.type.omniType.fqn, attributes.JACKSON_JSON_VALUE.name),
        );

        if (!jsonValueAnnotation && this.shouldAddJsonPropertyAnnotation(n.identifier.value, n.identifier.original, args.options)) {
          fieldsStack[fieldsStack.length - 1].annotate.push(n);
        }
      },

      visitProperty: (n, v) => {

        const jsonValueAnnotation = n.annotations?.children.find(
          it => (it instanceof Code.Annotation) && (it.type.omniType.kind == OmniTypeKind.HARDCODED_REFERENCE) && OmniUtil.isEqualObjectName(it.type.omniType.fqn, attributes.JACKSON_JSON_VALUE.name),
        );

        if (!jsonValueAnnotation) { // } && this.shouldAddJsonPropertyAnnotation(n.identifier.identifier.value, n.property?.name, args.options)) {
          fieldsStack[fieldsStack.length - 1].annotate.push(n);
        }

        return n;
      },

      visitMethodDeclaration: (n, v) => {

        // Figure out of method is a getter, and if it is, then add the JsonProperty there -- irregardless if constructor already adds one (until we can separate "client" vs "server")
        const getterField = CodeAstUtils.getGetterField(args.root, n);

        if (getterField && getterField.property) {

          const annotations = n.signature.annotations || new Code.AnnotationList(...[]);

          if (this.shouldAddJsonPropertyAnnotation(getterField.identifier.value, getterField.property.name, args.options)) {
            annotations.children.push(...JsonCSharpAstTransformer.createJacksonAnnotations(attributes, getterField.identifier.value, getterField.property, Direction.OUT, args.options, true));
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

          if (attributes.JACKSON_OBJECT_MAPPER.name) {
            const objectMapperTypeNode = new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JACKSON_OBJECT_MAPPER.name});
            delegateToObjectMapperNode.set(n.id, objectMapperTypeNode);
          }
        }
      },
    });

    args.root.visit(visitor);

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceField: (n, r) => {
        return defaultReducer.reduceField(n, r);
      },
      reduceWildcardType: (n, r) => {

        const converted = this.wildcardToJacksonType(attributes, n.omniType, args.options);
        if (converted) {
          return new Code.EdgeType(converted, n.implementation);
        }

        return defaultReducer.reduceWildcardType(n, r);
      },
      reduceEdgeType: (n, r) => {

        if (n.omniType.kind == OmniTypeKind.DICTIONARY) {

          // Check key and value and make the appropriate decision for what Jackson type might be the best one!
          const type = n.omniType;

          if (OmniUtil.isPrimitive(type.keyType) && type.keyType.kind == OmniTypeKind.STRING) {
            const nodeName = attributes.JACKSON_JSON_NODE.name;
            if (type.valueType.kind == OmniTypeKind.UNKNOWN || (type.valueType.kind == OmniTypeKind.HARDCODED_REFERENCE && OmniUtil.isEqualObjectName(type.valueType.fqn, nodeName))) {
              return args.root.getAstUtils().createTypeNode(type, n.implementation).reduce(r);
            }
          }
        }

        return defaultReducer.reduceEdgeType(n, r);
      },
      reduceVirtualAnnotationNode: n => {

        if (n.value.kind === Code.VirtualAnnotationKind.SERIALIZATION_VALUE) {
          if (attributes.JACKSON_JSON_VALUE.name) {
            return new Code.Annotation(
              new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JACKSON_JSON_VALUE.name}),
            );
          } else {
            return undefined;
          }
        }

        if (n.value.kind === Code.VirtualAnnotationKind.DESERIALIZATION_CREATOR) {
          if (attributes.JACKSON_JSON_CREATOR.name) {
            return new Code.Annotation(
              new Code.EdgeType({
                kind: OmniTypeKind.HARDCODED_REFERENCE,
                fqn: attributes.JACKSON_JSON_CREATOR.name,
              }),
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

          // Go from `delegate.apply(x)` to `objectMapper.convertValue(x, delegateReturnType)`
          const newArguments = [...n.args.children];
          newArguments.push(new Code.ClassReference(new Code.ClassName(delegate.returnType)));

          return new Code.MethodCall(
            new Code.MemberAccess(n.target, new Code.Identifier('convertValue')),
            new Code.ArgumentList(...newArguments),
          );
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  private wildcardToJacksonType(attributes: JsonAttributes, n: OmniUnknownType, options: CSharpOptions): OmniHardcodedReferenceType | undefined {

    const unknownKind = n.unknownKind ?? options.unknownType;
    if (unknownKind == UnknownKind.MUTABLE_OBJECT && attributes.JACKSON_JSON_OBJECT.name) {
      return {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JACKSON_JSON_OBJECT.name};
    } else if (unknownKind == UnknownKind.ANY && attributes.JACKSON_JSON_NODE.name) {
      return {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JACKSON_JSON_NODE.name};
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
      const asJackson = this.wildcardToJacksonType(attributes, n.omniType, options);
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
    const jsonValueVisitor = VisitorFactoryManager.create(defaultBooleanVisitor, {
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
    fieldName: string,
    property: OmniProperty,
    direction: Direction,
    targetOptions: TargetOptions & CSharpOptions,
    requiresName: boolean,
  ): Code.Annotation[] {

    const annotations: Code.Annotation[] = [];

    const jsonProperty = JsonCSharpAstTransformer.createJsonPropertyAnnotation(attributes, fieldName, property, direction, requiresName);
    if (jsonProperty) {
      annotations.push(jsonProperty);
    }

    if (targetOptions.serializationEnsureRequiredFieldExistence) {
      if (property.required && (direction == Direction.BOTH || direction == Direction.OUT) && attributes.JACKSON_JSON_INCLUDE.name && attributes.JACKSON_JSON_INCLUDE_PROP.name) {

        const jsonInclude = new Code.Annotation(
          new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JACKSON_JSON_INCLUDE.name}),
          new Code.AnnotationKeyValuePairList(
            new Code.AnnotationKeyValuePair(
              undefined,
              new Code.StaticMemberReference(
                new Code.ClassName(new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JACKSON_JSON_INCLUDE_PROP.name})),
                new Code.Identifier('ALWAYS'),
              ),
            ),
          ),
        );

        annotations.push(jsonInclude);
      }
    }

    return annotations;
  }

  private static createJsonPropertyAnnotation(
    attributes: JsonAttributes,
    fieldName: string,
    property: OmniProperty,
    direction: Direction,
    requiresName: boolean,
  ): Code.Annotation | undefined {

    const annotationArguments = new Code.AnnotationKeyValuePairList();

    const resolvedPropertyName = OmniUtil.getPropertyName(property.name);
    if (direction != Direction.OUT || (direction == Direction.OUT && fieldName != resolvedPropertyName)) {

      // NOTE: Perhaps if this is undefined (name is a regex), then we should add some other annotation?
      if (resolvedPropertyName) {
        annotationArguments.children.push(
          new Code.AnnotationKeyValuePair(
            undefined, // new Code.Identifier('PropertyName')
            new Code.Literal(resolvedPropertyName),
          ),
        );
      }
    } else if (requiresName) {
      return undefined;
    }

    if (property.required && !OmniUtil.hasSpecifiedConstantValue(property.type)) {
      annotationArguments.children.push(new Code.AnnotationKeyValuePair(
        new Code.Identifier('Required'),
        new Code.StaticMemberReference(
          new Code.ClassName(
            new Code.EdgeType({
              kind: OmniTypeKind.HARDCODED_REFERENCE,
              fqn: {namespace: ['Newtonsoft', 'Json'], edgeName: 'Required'},
            }),
          ),
          new Code.Identifier('Always'),
        )));
    }

    if (annotationArguments.children.length == 0) {
      return undefined;
    }

    if (!attributes.JACKSON_JSON_PROPERTY.name) {
      return undefined;
    }

    return new Code.Annotation(
      new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: attributes.JACKSON_JSON_PROPERTY.name}),
      annotationArguments,
    );
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
