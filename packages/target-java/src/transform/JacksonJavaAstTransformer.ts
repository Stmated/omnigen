import {AbstractJavaAstTransformer, JavaAstTransformerArgs, JavaAstUtils} from '../transform/index.ts';
import {AbortVisitingWithResult, assertUnreachable, OmniUtil, VisitorFactoryManager, VisitResultFlattener} from '@omnigen/core-util';
import {DefaultJavaVisitor} from '../visit/index.ts';
import * as Java from '../ast/index.ts';
import {OmniProperty, OmniTypeKind} from '@omnigen/core';
import {JavaOptions, SerializationConstructorAnnotationMode, SerializationLibrary, SerializationPropertyNameMode} from '../options/index.ts';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

const JACKSON_JSON_PROPERTY = 'com.fasterxml.jackson.annotation.JsonProperty';
export const JACKSON_JSON_VALUE = 'com.fasterxml.jackson.annotation.JsonValue';
export const JACKSON_JSON_CREATOR = 'com.fasterxml.jackson.annotation.JsonCreator';
const JACKSON_JSON_INCLUDE = 'com.fasterxml.jackson.annotation.JsonInclude';
export const JACKSON_JSON_ANY_GETTER = 'com.fasterxml.jackson.annotation.JsonAnyGetter';
export const JACKSON_JSON_ANY_SETTER = 'com.fasterxml.jackson.annotation.JsonAnySetter';

enum Direction {
  IN,
  OUT,
  BOTH,
}

export class JacksonJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    if (args.options.serializationLibrary != SerializationLibrary.JACKSON) {
      return;
    }

    logger.info(`Will be adding Jackson annotations to nodes`);

    const hasAnnotatedConstructor: boolean[] = [];

    type FieldStackEntry = {annotate: Java.Field[], skip: Java.Field[]};
    const fieldsStack: FieldStackEntry[] = [];

    const visitor = VisitorFactoryManager.create(DefaultJavaVisitor, {

      visitObjectDeclaration: (node, visitor) => {

        try {
          hasAnnotatedConstructor.push(false);
          fieldsStack.push({annotate: [], skip: []});
          return DefaultJavaVisitor.visitObjectDeclaration(node, visitor);
        } finally {

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
          it => (it.type.omniType.kind == OmniTypeKind.HARDCODED_REFERENCE) && (it.type.omniType.fqn == JACKSON_JSON_VALUE),
        );

        if (!jsonValueAnnotation && this.shouldAddJsonPropertyAnnotation(node.identifier.value, node.identifier.original, args.options)) {
          fieldsStack[fieldsStack.length - 1].annotate.push(node);
        }
      },

      visitMethodDeclaration: (node, visitor) => {

        // Figure out of method is a getter, and if it is, then add the JsonProperty there -- irregardless if constructor already adds one (until we can separate "client" vs "server")
        const getterField = JavaAstUtils.getGetterField(node);

        if (getterField && getterField.property) {

          const annotations = node.signature.annotations || new Java.AnnotationList(...[]);

          if (this.shouldAddJsonPropertyAnnotation(getterField.identifier.value, getterField.property.name, args.options)) {
            annotations.children.push(...JacksonJavaAstTransformer.createJacksonAnnotations(getterField.identifier.value, getterField.property, Direction.OUT, args.options, true));
            fieldsStack[fieldsStack.length - 1].skip.push(getterField);
          }

          if (!node.signature.annotations) {
            node.signature.annotations = annotations;
          }
        }
      },

      visitConstructor: node => {
        this.addAnnotationsToConstructor(node, args, hasAnnotatedConstructor);
      },
    });

    visitor.visitRootNode(args.root, visitor);
  }

  private addAnnotationsToConstructor(node: Java.ConstructorDeclaration, args: JavaAstTransformerArgs, hasAnnotatedConstructor: boolean[]) {
    const ownerType = node.owner.type.omniType;
    if (ownerType.kind == OmniTypeKind.OBJECT && ownerType.abstract) {

      // We do not add any annotations to an abstract class constructor, since they will be overridden anyway.
      return;
    }

    const annotations = node.annotations || new Java.AnnotationList(...[]);

    let hasJsonValue = false;

    const jsonValueVisitor = VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_BOOLEAN_VISITOR, {
      visitAnnotation: node => {
        if (node.type.omniType.kind == OmniTypeKind.HARDCODED_REFERENCE) {
          if (node.type.omniType.fqn.indexOf(JACKSON_JSON_VALUE) >= 0) {
            hasJsonValue = true;
          } else if (node.type.omniType.fqn.indexOf(JACKSON_JSON_CREATOR) >= 0) {
            throw new AbortVisitingWithResult(true); // Abort right away
          }
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
    const hasJsonCreator = VisitResultFlattener.visitWithSingularResult(jsonValueVisitor, node.owner.body, false);
    if (!hasJsonCreator) {
      if (constructorAnnotationMode == SerializationConstructorAnnotationMode.ALWAYS) {
        annotations.children.push(new Java.Annotation(new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_CREATOR})));
      } else if (constructorAnnotationMode == SerializationConstructorAnnotationMode.IF_REQUIRED) {

        // TODO: IF_REQUIRED might be needed if there are multiple constructors. But right now there are only ever one constructor.

        if ((!node.parameters || node.parameters.children.length <= 1) && hasJsonValue) {
          annotations.children.push(new Java.Annotation(new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_CREATOR})));
        }
      }
    }

    if (node.parameters && (constructorAnnotationMode == SerializationConstructorAnnotationMode.ALWAYS || constructorAnnotationMode == SerializationConstructorAnnotationMode.IF_REQUIRED)) {

      for (const parameter of node.parameters.children) {

        const property = parameter.field.property;
        if (!property) {
          continue;
        }

        const parameterAnnotations = parameter.annotations || new Java.AnnotationList();

        if (this.shouldAddJsonPropertyAnnotation(parameter.identifier.value, property.name, args.options)) {
          hasAnnotatedConstructor[hasAnnotatedConstructor.length - 1] = true;
          parameterAnnotations.children.push(...JacksonJavaAstTransformer.createJacksonAnnotations(parameter.field.identifier.value, property, Direction.IN, args.options, false));
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

    if (direction != Direction.OUT || (direction == Direction.OUT && fieldName != property.name)) {
      annotationArguments.children.push(new Java.AnnotationKeyValuePair(undefined, new Java.Literal(property.name)));
    } else if (requiresName) {
      return undefined;
    }

    if (property.required && !OmniUtil.isDefaultValueType(property.type)) {
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
      new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_PROPERTY}),
      annotationArguments,
    );
  }

  private static createJsonIncludeAnnotation(property: OmniProperty): Java.Annotation | undefined {

    if (property.required) {
      return new Java.Annotation(
        new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: JACKSON_JSON_INCLUDE}),
        new Java.AnnotationKeyValuePairList(
          new Java.AnnotationKeyValuePair(
            undefined,
            new Java.StaticMemberReference(
              new Java.ClassName(new Java.RegularType({kind: 'HARDCODED_REFERENCE', fqn: `${JACKSON_JSON_INCLUDE}.Include`})),
              new Java.Identifier('ALWAYS'),
            ),
          ),
        ),
      );
    }

    return undefined;
  }

  private shouldAddJsonPropertyAnnotation(sourceCodeName: string | undefined, propertyName: string | undefined, javaOptions: JavaOptions) {

    if (javaOptions.serializationPropertyNameMode == SerializationPropertyNameMode.ALWAYS) {
      return true;
    } else if (javaOptions.serializationPropertyNameMode == SerializationPropertyNameMode.IF_REQUIRED) {
      return (sourceCodeName ?? propertyName) != (propertyName ?? sourceCodeName);
    } else if (javaOptions.serializationPropertyNameMode == SerializationPropertyNameMode.SKIP) {
      return false;
    }

    assertUnreachable(javaOptions.serializationPropertyNameMode);
  }
}
