import {AbstractJavaAstTransformer, JavaAndTargetOptions, JavaAstTransformerArgs, JavaAstUtils} from '../transform';
import {Direction, ObjectName, ObjectNameResolver, OmniHardcodedReferenceType, OmniProperty, OmniPropertyName, OmniTypeKind, OmniUnknownType, UnknownKind} from '@omnigen/api';
import {AbortVisitingWithResult, assertDefined, assertUnreachable, OmniUtil, Visitor, VisitResultFlattener} from '@omnigen/core';
import * as Java from '../ast/JavaAst';
import {DelegateKind, VirtualAnnotationKind} from '../ast/JavaAst';
import {JavaOptions, SerializationConstructorAnnotationMode, SerializationLibrary} from '../options';
import {LoggerFactory} from '@omnigen/core-log';
import * as Code from '@omnigen/target-code/ast';
import {SerializationPropertyNameMode} from '@omnigen/target-code';
import {JavaObjectNameResolver} from '../ast/JavaObjectNameResolver';

const logger = LoggerFactory.create(import.meta.url);

const JACKSON_JSON_PROPERTY: ObjectName = {namespace: ['com', 'fasterxml', 'jackson', 'annotation'], edgeName: 'JsonProperty'};
export const JACKSON_JSON_VALUE: ObjectName = {namespace: ['com', 'fasterxml', 'jackson', 'annotation'], edgeName: 'JsonValue'};
const JACKSON_JSON_CREATOR: ObjectName = {namespace: ['com', 'fasterxml', 'jackson', 'annotation'], edgeName: 'JsonCreator'};
const JACKSON_JSON_INCLUDE: ObjectName = {namespace: ['com', 'fasterxml', 'jackson', 'annotation'], edgeName: 'JsonInclude'};
export const JACKSON_JSON_ANY_GETTER: ObjectName = {namespace: ['com', 'fasterxml', 'jackson', 'annotation'], edgeName: 'JsonAnyGetter'};
export const JACKSON_JSON_ANY_SETTER: ObjectName = {namespace: ['com', 'fasterxml', 'jackson', 'annotation'], edgeName: 'JsonAnySetter'};
export const JACKSON_JSON_NODE: ObjectName = {namespace: ['com', 'fasterxml', 'jackson', 'databind'], edgeName: 'JsonNode'};
const JACKSON_JSON_OBJECT: ObjectName = {namespace: ['com', 'fasterxml', 'jackson', 'databind', 'node'], edgeName: 'ObjectNode'};
const JACKSON_JSON_NODE_FACTORY: ObjectName = {namespace: ['com', 'fasterxml', 'jackson', 'databind', 'node'], edgeName: 'JsonNodeFactory'};

export const JACKSON_OBJECT_MAPPER: ObjectName = {namespace: ['com', 'fasterxml', 'jackson', 'databind'], edgeName: 'ObjectMapper'};

export class JacksonJavaAstTransformer extends AbstractJavaAstTransformer {

  private static readonly _JAVA_NAME_RESOLVER = new JavaObjectNameResolver();
  private static readonly _NS_DATABIND = JacksonJavaAstTransformer._JAVA_NAME_RESOLVER.parseNamespace('com.fasterxml.jackson.databind');

  transformAst(args: JavaAstTransformerArgs): void {

    if (args.options.serializationLibrary !== SerializationLibrary.JACKSON) {
      return;
    }

    const hasAnnotatedConstructor: boolean[] = [];

    type FieldStackEntry = { annotate: Java.Field[], skip: Java.Field[] };
    const fieldsStack: FieldStackEntry[] = [];
    const objectDecStack: Java.AbstractObjectDeclaration[] = [];

    const delegateToObjectMapperNode = new Map<number, Java.TypeNode>();

    const nameResolver = args.root.getNameResolver();

    const defaultVisitor = args.root.createVisitor();
    const visitor = Visitor.create(defaultVisitor, {

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
          const entry = fieldsStack.pop()!;
          for (const field of entry.annotate) {
            if (!field.property || entry.skip.includes(field)) {
              continue;
            }

            if (!this.shouldAddJsonPropertyAnnotation(field.identifier.value, field.property.name, args.options)) {
              continue;
            }

            const annotations = field.annotations || new Java.AnnotationList();
            annotations.children.push(...JacksonJavaAstTransformer.createJacksonAnnotations(field.identifier.value, field.property, Direction.BOTH, args.options, false));
            if (!field.annotations && annotations.children.length > 0) {
              field.annotations = annotations;
            }
          }

          hasAnnotatedConstructor.pop();
        }
      },

      visitField: n => {

        // A JsonValue field should not have any JsonProperty added to it.
        const jsonValueAnnotation = n.annotations?.children.find(
          it => (it instanceof Java.Annotation) && (it.type.omniType.kind === OmniTypeKind.HARDCODED_REFERENCE) && nameResolver.isEqual(it.type.omniType.fqn, JACKSON_JSON_VALUE),
        );

        if (!jsonValueAnnotation && this.shouldAddJsonPropertyAnnotation(n.identifier.value, n.identifier.original, args.options)) {
          fieldsStack[fieldsStack.length - 1].annotate.push(n);
        }
      },

      visitMethodDeclaration: (n, v) => {
        defaultVisitor.visitMethodDeclaration(n, v);

        // Figure out if method is a getter, and if it is, then add the JsonProperty there -- irregardless if constructor already adds one (until we can separate "client" vs "server")
        const getterField = JavaAstUtils.getGetterField(args.root, n);

        if (getterField && getterField.property) {

          const stackEntry = fieldsStack[fieldsStack.length - 1];
          if (stackEntry.annotate.includes(getterField)) {

            // The field will already have annotations added, so no need to also add them to the getter.
            return;
          }

          const annotations = n.signature.annotations || new Java.AnnotationList();

          if (this.shouldAddJsonPropertyAnnotation(getterField.identifier.value, getterField.property.name, args.options)) {
            annotations.children.push(...JacksonJavaAstTransformer.createJacksonAnnotations(getterField.identifier.value, getterField.property, Direction.OUT, args.options, true));
            // fieldsStack[fieldsStack.length - 1].skip.push(getterField);
          }

          if (!n.signature.annotations) {
            n.signature.annotations = annotations;
          }
        }
      },

      visitConstructor: node => {

        const owner = objectDecStack[objectDecStack.length - 1];
        this.addAnnotationsToConstructor(node, owner, args, hasAnnotatedConstructor);
      },

      visitDelegate: n => {

        if (n.kind === DelegateKind.CONVERTER && n.returnType && n.parameterTypes.length == 1 && this.isJacksonNodeType(n.parameterTypes[0], args.options, nameResolver)) {

          const objectMapperTypeNode = new Code.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_OBJECT_MAPPER});
          delegateToObjectMapperNode.set(n.id, objectMapperTypeNode);
        }
      },
    });

    args.root.visit(visitor);

    const enumFieldIdsToAnnotate = new Set<number>();

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
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

              const type = n.omniType;
              const mapClassOrInterface = n.implementation ? 'HashMap' : 'Map';
              const mapType = new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JacksonJavaAstTransformer._JAVA_NAME_RESOLVER.parse(`java.util.${mapClassOrInterface}`)});

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

        if (n.value.kind === VirtualAnnotationKind.SERIALIZATION_ALIAS) {
          return new Java.Annotation(
            new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_PROPERTY}),
            new Java.AnnotationKeyValuePairList(
              new Java.AnnotationKeyValuePair(
                new Java.Identifier('value'),
                new Java.Literal(n.value.name),
              ),
            ),
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

          // Go from `delegate.apply(x)` to `objectMapper.treeToValue(x, delegateReturnType)`
          const newArguments = [...n.args.children];
          newArguments.push(new Code.ClassReference(new Code.ClassName(delegate.returnType)));

          return new Code.MethodCall(
            new Code.MemberAccess(n.target, new Code.Identifier('treeToValue')),
            new Code.ArgumentList(...newArguments),
          );
        }

        return n;
      },

      reduceEnumDeclaration: (n, r) => {
        const fields = n.body.children.filter(it => it instanceof Code.Field);
        if (fields.length == 1) {
          enumFieldIdsToAnnotate.add(fields[0].id);
        }

        return defaultReducer.reduceEnumDeclaration(n, r);
      },
      reduceField: (n, r) => {

        if (n.hasId(enumFieldIdsToAnnotate)) {

          if (!n.annotations) {
            n.annotations = new Code.AnnotationList();
          }

          // TODO: This should be immutable, and return a new instance of the field with this annotation added.
          n.annotations.children.push(new Java.Annotation(
            new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_VALUE}),
          ));
        }

        return defaultReducer.reduceField(n, r);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  private wildcardToJacksonType(n: OmniUnknownType, options: JavaAndTargetOptions): OmniHardcodedReferenceType | undefined {

    const unknownKind = n.unknownKind ?? options.unknownType;
    if (unknownKind === UnknownKind.DYNAMIC_OBJECT) {
      return {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_OBJECT};
    } else if (unknownKind === UnknownKind.DYNAMIC) {
      return {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_NODE};
    }

    return undefined;
  }

  private isJacksonNodeType(n: Java.TypeNode, options: JavaAndTargetOptions, nameResolver: ObjectNameResolver): boolean {

    if (n.omniType.kind === OmniTypeKind.HARDCODED_REFERENCE) {
      // Either it already is a Jackson node.
      if (nameResolver.startsWithNamespace(n.omniType.fqn, JacksonJavaAstTransformer._NS_DATABIND)) {
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

    const annotations = node.annotations || new Java.AnnotationList();

    let hasJsonValue = false;

    const defaultBooleanVisitor = args.root.createVisitor<boolean>();
    const jsonValueVisitor = Visitor.create(defaultBooleanVisitor, {
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
    const addAlways = (constructorAnnotationMode == SerializationConstructorAnnotationMode.ALWAYS);
    const addIfRequired = (constructorAnnotationMode == SerializationConstructorAnnotationMode.IF_REQUIRED);

    const hasJsonCreator = VisitResultFlattener.visitWithSingularResult(jsonValueVisitor, owner.body, false);
    if (!hasJsonCreator) {
      if (addAlways) {
        annotations.children.push(new Java.Annotation(new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_CREATOR})));
      } else if (addIfRequired) {

        // TODO: IF_REQUIRED might be needed if there are multiple constructors. But right now there are only ever one constructor.

        if ((!node.parameters || node.parameters.children.length <= 1) && hasJsonValue) {
          annotations.children.push(new Java.Annotation(new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_CREATOR})));
        }
      }
    }

    if (node.parameters && (addAlways || addIfRequired)) {

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

        if (this.shouldAddJsonPropertyAnnotation(parameter.identifier.value, property.name, args.options) || (addIfRequired && node.parameters.children.length <= 1)) {
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
        annotationArguments.children.push(new Java.AnnotationKeyValuePair(new Java.Identifier('value'), new Java.Literal(resolvedPropertyName)));
      }
    } else if (requiresName) {
      return undefined;
    }

    if (property.required && !OmniUtil.hasSpecifiedConstantValue(property.type)) {
      annotationArguments.children.push(new Java.AnnotationKeyValuePair(new Java.Identifier('required'), new Java.Literal(true)));
    }

    // if (annotationArguments.children.length > 1) {
    //
    //   const unnamed = annotationArguments.children.find(it => it.key === undefined);
    //   if (unnamed) {
    //     unnamed.key = new Java.Identifier('value');
    //   }
    // }

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
          // new Java.AnnotationKeyValuePair(
          //   undefined,
          //   new Java.StaticMemberReference(
          //     new Java.ClassName(
          //       new Java.EdgeType({
          //         kind: OmniTypeKind.HARDCODED_REFERENCE,
          //         fqn: {namespace: ['com', 'fasterxml', 'jackson', 'annotation', {name: 'JsonInclude', nested: true}], edgeName: 'Include'},
          //       })),
          //     new Java.Identifier('ALWAYS'),
          //   ),
          // ),
        ),
      );
    }

    return undefined;
  }

  private shouldAddJsonPropertyAnnotation(sourceCodeName: string | undefined, propertyName: OmniPropertyName | undefined, javaOptions: JavaOptions) {

    if (javaOptions.serializationPropertyNameMode === SerializationPropertyNameMode.ALWAYS) {
      return true;
    } else if (javaOptions.serializationPropertyNameMode === SerializationPropertyNameMode.IF_REQUIRED) {

      const resolvedPropertyName = propertyName ? OmniUtil.getPropertyName(propertyName) : undefined;
      return (sourceCodeName ?? resolvedPropertyName) != (resolvedPropertyName ?? sourceCodeName);

    } else if (javaOptions.serializationPropertyNameMode === SerializationPropertyNameMode.SKIP) {
      return false;
    }

    assertUnreachable(javaOptions.serializationPropertyNameMode);
  }
}
