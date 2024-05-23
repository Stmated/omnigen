import {AbstractJavaAstTransformer, JavaAndTargetOptions, JavaAstTransformerArgs, JavaAstUtils} from '../transform';
import {Direction, OmniHardcodedReferenceType, OmniProperty, OmniPropertyName, OmniType, OmniTypeKind, OmniUnknownType, UnknownKind} from '@omnigen/core';
import {AbortVisitingWithResult, assertDefined, assertUnreachable, OmniUtil, VisitorFactoryManager, VisitResultFlattener} from '@omnigen/core-util';
import * as Java from '../ast/JavaAst';
import {DelegateKind, VirtualAnnotationKind} from '../ast/JavaAst';
import {JavaOptions, SerializationConstructorAnnotationMode, SerializationLibrary, SerializationPropertyNameMode} from '../options';
import {LoggerFactory} from '@omnigen/core-log';
import * as Code from '@omnigen/target-code/ast';

const logger = LoggerFactory.create(import.meta.url);

const JACKSON_JSON_PROPERTY = 'com.fasterxml.jackson.annotation.JsonProperty';
export const JACKSON_JSON_VALUE = 'com.fasterxml.jackson.annotation.JsonValue';
export const JACKSON_JSON_CREATOR = 'com.fasterxml.jackson.annotation.JsonCreator';
const JACKSON_JSON_INCLUDE = 'com.fasterxml.jackson.annotation.JsonInclude';
export const JACKSON_JSON_ANY_GETTER = 'com.fasterxml.jackson.annotation.JsonAnyGetter';
export const JACKSON_JSON_ANY_SETTER = 'com.fasterxml.jackson.annotation.JsonAnySetter';
const JACKSON_JSON_NODE = 'com.fasterxml.jackson.databind.JsonNode';
const JACKSON_JSON_OBJECT = 'com.fasterxml.jackson.databind.node.ObjectNode';
const JACKSON_JSON_NODE_FACTORY = 'com.fasterxml.jackson.databind.node.JsonNodeFactory';

export const JACKSON_OBJECT_MAPPER = 'com.fasterxml.jackson.databind.ObjectMapper';

export class JacksonJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    if (args.options.serializationLibrary !== SerializationLibrary.JACKSON) {
      return;
    }

    const hasAnnotatedConstructor: boolean[] = [];

    type FieldStackEntry = { annotate: Java.Field[], skip: Java.Field[] };
    const fieldsStack: FieldStackEntry[] = [];
    const objectDecStack: Java.AbstractObjectDeclaration[] = [];

    const delegateToObjectMapperNode = new Map<number, Java.TypeNode>();

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

            for (const field of entry.annotate) {
              if (!field.property || entry.skip.includes(field)) {
                continue;
              }

              if (!this.shouldAddJsonPropertyAnnotation(field.identifier.value, field.property.name, args.options)) {
                continue;
              }

              const annotations = field.annotations || new Java.AnnotationList(...[]);
              annotations.children.push(...JacksonJavaAstTransformer.createJacksonAnnotations(field.identifier.value, field.property, Direction.BOTH, args.options, false));
              if (!field.annotations && annotations.children.length > 0) {
                field.annotations = annotations;
              }
            }
          }

          hasAnnotatedConstructor.pop();
        }
      },

      visitField: node => {

        // A JsonValue field should not have any JsonProperty added to it.
        const jsonValueAnnotation = node.annotations?.children.find(
          it => (it instanceof Java.Annotation) && (it.type.omniType.kind == OmniTypeKind.HARDCODED_REFERENCE) && (it.type.omniType.fqn == JACKSON_JSON_VALUE),
        );

        if (!jsonValueAnnotation && this.shouldAddJsonPropertyAnnotation(node.identifier.value, node.identifier.original, args.options)) {
          fieldsStack[fieldsStack.length - 1].annotate.push(node);
        }
      },

      visitMethodDeclaration: (n, v) => {

        // Figure out of method is a getter, and if it is, then add the JsonProperty there -- irregardless if constructor already adds one (until we can separate "client" vs "server")
        const getterField = JavaAstUtils.getGetterField(args.root, n);

        if (getterField && getterField.property) {

          const annotations = n.signature.annotations || new Java.AnnotationList(...[]);

          if (this.shouldAddJsonPropertyAnnotation(getterField.identifier.value, getterField.property.name, args.options)) {
            annotations.children.push(...JacksonJavaAstTransformer.createJacksonAnnotations(getterField.identifier.value, getterField.property, Direction.OUT, args.options, true));
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

        if (n.kind === DelegateKind.CONVERTER && n.returnType && n.parameterTypes.length == 1 && this.isJacksonNodeType(n.parameterTypes[0], args.options)) {

          const objectMapperTypeNode = new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_OBJECT_MAPPER});
          delegateToObjectMapperNode.set(n.id, objectMapperTypeNode);
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

        const converted = this.wildcardToJacksonType(n.omniType, args.options);
        if (converted) {
          return new Java.EdgeType(converted, n.implementation);
        }

        return defaultReducer.reduceWildcardType(n, r);
      },
      reduceEdgeType: (n, r) => {

        if (n.omniType.kind == OmniTypeKind.DICTIONARY) {

          // Check key and value and make the appropriate decision for what Jackson type might be the best one!
          const type = n.omniType;
          const keyType = assertDefined(args.root.getAstUtils().createTypeNode(type.keyType, true).reduce(r));
          const valueType = assertDefined(args.root.getAstUtils().createTypeNode(type.valueType, true).reduce(r));

          if (OmniUtil.isPrimitive(keyType.omniType) && keyType.omniType.kind == OmniTypeKind.STRING) {
            if (valueType.omniType.kind == OmniTypeKind.UNKNOWN || (valueType.omniType.kind == OmniTypeKind.HARDCODED_REFERENCE && valueType.omniType.fqn == JACKSON_JSON_NODE)) {
              // return new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_OBJECT}, n.implementation);

              const type = n.omniType;
              const mapClassOrInterface = n.implementation ? 'HashMap' : 'Map';
              const mapType = new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: `java.util.${mapClassOrInterface}`});

              return new Java.GenericType(type, mapType, [keyType, valueType]);
            }
          }
        }

        return defaultReducer.reduceEdgeType(n, r);
      },
      reduceVirtualAnnotationNode: n => {

        if (n.value.kind === VirtualAnnotationKind.SERIALIZATION_VALUE) {
          return new Java.Annotation(
            new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_VALUE}),
          );
        }

        if (n.value.kind === VirtualAnnotationKind.DESERIALIZATION_CREATOR) {
          return new Java.Annotation(
            new Java.EdgeType({
              kind: OmniTypeKind.HARDCODED_REFERENCE,
              fqn: JACKSON_JSON_CREATOR,
            }),
          );
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

  private wildcardToJacksonType(n: OmniUnknownType, options: JavaAndTargetOptions): OmniHardcodedReferenceType | undefined {

    const unknownKind = n.unknownKind ?? options.unknownType;
    if (unknownKind == UnknownKind.MUTABLE_OBJECT) {
      return {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_OBJECT};
    } else if (unknownKind == UnknownKind.ANY) {
      return {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_NODE};
    }

    return undefined;
  }

  private isJacksonNodeType(n: Java.TypeNode, options: JavaAndTargetOptions): boolean {

    if (n.omniType.kind === OmniTypeKind.HARDCODED_REFERENCE) {
      // Either it already is a Jackson node.
      if (n.omniType.fqn.startsWith('com.fasterxml.jackson.databind')) {
        return true;
      }
    } else if (n.omniType.kind === OmniTypeKind.UNKNOWN) {

      // Or it is one that will be converted by this transformer later by a reducer.
      const asJackson = this.wildcardToJacksonType(n.omniType, options);
      if (asJackson) {
        return true;
      }
    }

    return false;
  }

  private addAnnotationsToConstructor(node: Java.ConstructorDeclaration, owner: Java.AbstractObjectDeclaration, args: JavaAstTransformerArgs, hasAnnotatedConstructor: boolean[]) {

    const ownerType = owner.type.omniType;
    if (ownerType.kind == OmniTypeKind.OBJECT && ownerType.abstract) {

      // We do not add any annotations to an abstract class constructor, since they will be overridden anyway.
      return;
    }

    const annotations = node.annotations || new Java.AnnotationList(...[]);

    let hasJsonValue = false;

    const defaultBooleanVisitor = args.root.createVisitor<boolean>();
    const jsonValueVisitor = VisitorFactoryManager.create(defaultBooleanVisitor, {
      // visitAnnotation: node => {
      //   if (node.type.omniType.kind == OmniTypeKind.HARDCODED_REFERENCE) {
      //     if (node.type.omniType.fqn.indexOf(JACKSON_JSON_VALUE) >= 0) {
      //       hasJsonValue = true;
      //     } else if (node.type.omniType.fqn.indexOf(JACKSON_JSON_CREATOR) >= 0) {
      //       throw new AbortVisitingWithResult(true); // Abort right away
      //     }
      //   }
      // },
      visitVirtualAnnotationNode: n => {
        if (n.value.kind === VirtualAnnotationKind.SERIALIZATION_VALUE) {
          hasJsonValue = true;
        } else if (n.value.kind === VirtualAnnotationKind.DESERIALIZATION_CREATOR) {
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

    const constructorAnnotationMode = args.options.serializationConstructorAnnotationMode;
    const hasJsonCreator = VisitResultFlattener.visitWithSingularResult(jsonValueVisitor, owner.body, false);
    if (!hasJsonCreator) {
      if (constructorAnnotationMode == SerializationConstructorAnnotationMode.ALWAYS) {
        annotations.children.push(new Java.Annotation(new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_CREATOR})));
      } else if (constructorAnnotationMode == SerializationConstructorAnnotationMode.IF_REQUIRED) {

        // TODO: IF_REQUIRED might be needed if there are multiple constructors. But right now there are only ever one constructor.

        if ((!node.parameters || node.parameters.children.length <= 1) && hasJsonValue) {
          annotations.children.push(new Java.Annotation(new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_CREATOR})));
        }
      }
    }

    if (node.parameters && (constructorAnnotationMode == SerializationConstructorAnnotationMode.ALWAYS || constructorAnnotationMode == SerializationConstructorAnnotationMode.IF_REQUIRED)) {

      for (const parameter of node.parameters.children) {

        const resolved = args.root.resolveNodeRef(parameter.ref);
        const field = (resolved instanceof Java.Field) ? resolved : undefined;
        if (!field) {
          continue;
        }

        const property = field.property;
        if (!property) {
          continue;
        }

        const parameterAnnotations = parameter.annotations || new Java.AnnotationList();

        if (this.shouldAddJsonPropertyAnnotation(parameter.identifier.value, property.name, args.options)) {
          hasAnnotatedConstructor[hasAnnotatedConstructor.length - 1] = true;
          parameterAnnotations.children.push(...JacksonJavaAstTransformer.createJacksonAnnotations(field.identifier.value, property, Direction.IN, args.options, false));
        }

        if (!parameter.annotations && parameterAnnotations.children.length > 0) {
          parameter.annotations = parameterAnnotations;
        }
      }
    }

    if (!node.annotations && annotations.children.length > 0) {
      node.annotations = annotations;
    }
  }

  private static createJacksonAnnotations(fieldName: string, property: OmniProperty, direction: Direction, javaOptions: JavaOptions, requiresName: boolean): Java.Annotation[] {

    const annotations: Java.Annotation[] = [];

    const jsonProperty = JacksonJavaAstTransformer.createJsonPropertyAnnotation(fieldName, property, direction, requiresName);
    if (jsonProperty) {
      annotations.push(jsonProperty);
    }

    if (javaOptions.serializationEnsureRequiredFieldExistence) {
      if (direction == Direction.BOTH || direction == Direction.OUT) {
        const jsonInclude = JacksonJavaAstTransformer.createJsonIncludeAnnotation(property);
        if (jsonInclude) {
          annotations.push(jsonInclude);
        }
      }
    }

    return annotations;
  }

  private static createJsonPropertyAnnotation(fieldName: string, property: OmniProperty, direction: Direction, requiresName: boolean): Java.Annotation | undefined {

    const annotationArguments = new Java.AnnotationKeyValuePairList();

    const resolvedPropertyName = OmniUtil.getPropertyName(property.name);
    if (direction != Direction.OUT || (direction == Direction.OUT && fieldName != resolvedPropertyName)) {

      // NOTE: Perhaps if this is undefined (name is a regex), then we should add some other annotation?
      if (resolvedPropertyName) {
        annotationArguments.children.push(new Java.AnnotationKeyValuePair(undefined, new Java.Literal(resolvedPropertyName)));
      }
    } else if (requiresName) {
      return undefined;
    }

    if (property.required && !OmniUtil.hasSpecifiedConstantValue(property.type)) {
      annotationArguments.children.push(new Java.AnnotationKeyValuePair(new Java.Identifier('required'), new Java.Literal(true)));
    }

    if (annotationArguments.children.length > 1) {

      const unnamed = annotationArguments.children.find(it => it.key === undefined);
      if (unnamed) {
        unnamed.key = new Java.Identifier('value');
      }
    }

    if (annotationArguments.children.length == 0) {
      return undefined;
    }

    return new Java.Annotation(
      new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_PROPERTY}),
      annotationArguments,
    );
  }

  private static createJsonIncludeAnnotation(property: OmniProperty): Java.Annotation | undefined {

    if (property.required) {
      return new Java.Annotation(
        new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_INCLUDE}),
        new Java.AnnotationKeyValuePairList(
          new Java.AnnotationKeyValuePair(
            undefined,
            new Java.StaticMemberReference(
              new Java.ClassName(new Java.EdgeType({kind: 'HARDCODED_REFERENCE', fqn: `${JACKSON_JSON_INCLUDE}.Include`})),
              new Java.Identifier('ALWAYS'),
            ),
          ),
        ),
      );
    }

    return undefined;
  }

  private shouldAddJsonPropertyAnnotation(sourceCodeName: string | undefined, propertyName: OmniPropertyName | undefined, javaOptions: JavaOptions) {

    if (javaOptions.serializationPropertyNameMode == SerializationPropertyNameMode.ALWAYS) {
      return true;
    } else if (javaOptions.serializationPropertyNameMode == SerializationPropertyNameMode.IF_REQUIRED) {

      const resolvedPropertyName = propertyName ? OmniUtil.getPropertyName(propertyName) : undefined;
      return (sourceCodeName ?? resolvedPropertyName) != (resolvedPropertyName ?? sourceCodeName);

    } else if (javaOptions.serializationPropertyNameMode == SerializationPropertyNameMode.SKIP) {
      return false;
    }

    assertUnreachable(javaOptions.serializationPropertyNameMode);
  }
}
