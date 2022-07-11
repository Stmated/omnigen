import {AbstractJavaTransformer} from './AbstractJavaTransformer';
import {Block, JavaCstRootNode, JavaOptions, JavaUtil, ModifierType} from '@java';
import {
  CompositionKind,
  OmniCompositionType,
  OmniEnumType,
  OmniExamplePairing,
  OmniGenericSourceIdentifierType,
  OmniLinkMapping,
  OmniModel,
  OmniObjectType,
  OmniOutput,
  OmniPrimitiveType,
  OmniProperty,
  OmniReferenceType,
  OmniType,
  OmniTypeKind,
  PrimitiveNullableKind
} from '@parse';
import * as Java from '@java/cst';
import {camelCase, constantCase, pascalCase} from 'change-case';
import {Naming} from '@parse/Naming';
import {DEFAULT_GRAPH_OPTIONS, DependencyGraph, DependencyGraphBuilder} from '@parse/DependencyGraphBuilder';
import {JavaDependencyGraph} from '@java/JavaDependencyGraph';
import {OmniModelUtil} from '@parse/OmniModelUtil';

export class JavaBaseTransformer extends AbstractJavaTransformer {
  private static readonly PATTERN_IDENTIFIER = new RegExp(/\b[_a-zA-Z][_a-zA-Z0-9]*\b/);

  private static readonly _primitiveWrapperMap = new Map<string, Java.ClassDeclaration>();

  transform(model: OmniModel, root: JavaCstRootNode, options: JavaOptions): Promise<void> {

    // TODO: Move most of this to another transformer later
    // TODO: Investigate the types and see which ones should be interfaces, and which ones should be classes

    const exportableTypes = OmniModelUtil.getAllExportableTypes(model, model.types);

    for (const type of exportableTypes.all) {

      if (!type.nameClassifier) {
        if (type.kind == OmniTypeKind.PRIMITIVE) {

          // Help with potential naming collisions.
          let fqn = JavaUtil.getFullyQualifiedName(type);
          const fqnLastDotIndex = fqn.lastIndexOf('.');
          if (fqnLastDotIndex != -1) {
            fqn = fqn.substring(fqnLastDotIndex + 1);
          }

          type.nameClassifier = fqn;
        }
      }
    }

    for (const type of exportableTypes.all) {
      if (type.kind == OmniTypeKind.PRIMITIVE && type.nullable == PrimitiveNullableKind.NOT_NULLABLE_PRIMITIVE) {

        // The primitive is said to not be nullable, but to still be a primitive.
        // This is not really possible in Java, so we need to wrap it inside a custom class.
        const kindName = pascalCase(JavaUtil.getPrimitiveKindName(type));
        let primitiveClass = JavaBaseTransformer._primitiveWrapperMap.get(kindName);
        if (!primitiveClass) {

          primitiveClass = this.createNotNullablePrimitiveWrapper(type, kindName);
          JavaBaseTransformer._primitiveWrapperMap.set(kindName, primitiveClass);

          root.children.push(
            new Java.CompilationUnit(
              new Java.PackageDeclaration(options.package),
              new Java.ImportList([]),
              primitiveClass
            )
          );
        }

        this.replaceTypeWithReference(type, type, primitiveClass, options);
      }
    }

    const typeNames: string[] = [];
    for (const type of exportableTypes.all) {
      const typeName = Naming.unwrap(type.name);
      if (!JavaBaseTransformer.PATTERN_IDENTIFIER.test(typeName)) {
        // The type does not have a valid name; what can we do about it?
        throw new Error(`Type name '${typeName}' (${type.description || type.summary || type.kind}) is not valid`);
      } else {
        // The type has a valid name, but we will make sure it is in PascalCase for Java.
        // Also replace the callback with a new one, so it is set in stone from now on.
        type.name = Naming.safer(type, (v) => typeNames.includes(v));
        if (type.kind != OmniTypeKind.PRIMITIVE) {

          // If the type is primitive, then we don't care if it clashes with something else.
          // That is because the type will not be generated into a Compilation Unit anyway.
          typeNames.push(type.name);
        }
      }
    }

    const removedTypes: OmniType[] = [];
    for (const type of exportableTypes.all) {
      removedTypes.push(...this.simplifyTypeAndReturnUnwanted(type));
    }

    // NOTE: Is this actually correct? Could it not delete types we actually want?
    exportableTypes.all = exportableTypes.all.filter(it => !removedTypes.includes(it));

    // TODO: Incorrect call signature, need to separate edge and named types.
    const graph = DependencyGraphBuilder.build(exportableTypes.all, DEFAULT_GRAPH_OPTIONS);

    for (const type of exportableTypes.all) {

      if (type.kind == OmniTypeKind.ARRAY) {

        // What do we do here?

      } else if (type.kind == OmniTypeKind.ENUM) {
        this.transformEnum(model, type, root, options);
      } else if (type.kind == OmniTypeKind.COMPOSITION) {

        // A composition type is likely just like any other object.
        // Just that has no real content in itself, but made up of the different parts.
        // If the composition is a "extends A and B"
        // Then it should be extending A, and implementing B interface, and rendering B properties
        this.transformObject(model, type, options, root, graph)

      } else if (type.kind == OmniTypeKind.OBJECT) {
        this.transformObject(model, type, options, root, graph);
      } else if (type.kind == OmniTypeKind.GENERIC_SOURCE) {
        this.transformObject(model, type.of, options, root, graph, type.sourceIdentifiers);
      } else if (type.kind == OmniTypeKind.GENERIC_TARGET) {
        // This is a target, it can/should never exist outside another type/as a top-level type.
        // It will checked for when adding/rendering the extension declarations.
      } else if (type.kind == OmniTypeKind.NULL) {

      } else if (type.kind == OmniTypeKind.PRIMITIVE) {

        // This is a primitive
      } else if (type.kind == OmniTypeKind.DICTIONARY) {

        // This is a map. What to do here? It's a top-level type, so...?
      } else if (type.kind == OmniTypeKind.REFERENCE) {

        // This is a map in the target language, which we have zero control over.
      } else if (type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

        // This is a list of static properties. This should modify the model, creating a marker interface?
        // Like an ISomethingOrOtherOrDifferent that contains the common properties, or is just empty?
        // (preferably they contain the ones in common, just because it's Nice).

      } else if (type.kind == OmniTypeKind.ARRAY_TYPES_BY_POSITION) {

        // This is a list of static types. This should modify the model, creating a marker interface?
        // Like an ISomethingOrOtherOrDifferent that contains the common properties, or is just empty?
        // (preferably they contain the ones in common, just because it's Nice).
      }

      // TODO: Find interface
    }

    return Promise.resolve();
  }

  private createNotNullablePrimitiveWrapper(type: OmniPrimitiveType, kindName: string): Java.ClassDeclaration {

    const valueType: OmniPrimitiveType = {
      kind: OmniTypeKind.PRIMITIVE,
      primitiveKind: type.primitiveKind,
      name: `NullSafe${kindName}`
    };

    const valueIdentifier = new Java.Identifier('value');
    const valueField = new Java.Field(
      new Java.Type(valueType),
      valueIdentifier,
      new Java.ModifierList(
        new Java.Modifier(ModifierType.PRIVATE),
        new Java.Modifier(ModifierType.FINAL)
      ),
      undefined,
      new Java.AnnotationList(
        new Java.Annotation(
          new Java.Type({
            kind: OmniTypeKind.REFERENCE,
            fqn: 'com.fasterxml.jackson.annotation.JsonValue',
            name: 'JsonValue'
          })
        )
      )
    );

    return new Java.ClassDeclaration(
      new Java.Type(valueType),
      new Java.Identifier(`Primitive${kindName}`),
      new Java.Block(
        valueField,
        // Force the name to be "getValue" so that it does not become "isValue" for a primitive boolean.
        new Java.FieldBackedGetter(valueField, undefined, undefined, new Java.Identifier('getValue'))
      ),
    );
  }

  private transformEnum(model: OmniModel, type: OmniEnumType, root: JavaCstRootNode, options: JavaOptions): void {
    const body = new Java.Block();

    const enumDeclaration = new Java.EnumDeclaration(
      new Java.Type(type),
      new Java.Identifier(Naming.unwrap(type.name)),
      body,
    );

    const comments = this.getCommentsForType(type, model, options);
    if (comments.length > 0) {
      enumDeclaration.comments = new Java.CommentList(...comments);
    }

    if (type.enumConstants) {
      body.children.push(
        new Java.EnumItemList(
          ...type.enumConstants.map(item => new Java.EnumItem(
            new Java.Identifier(constantCase(String(item))),
            new Java.Literal(item)
          ))
        )
      );

      // NOTE: It would be better if we did not need to create this. Leaking responsibilities.
      //        Should the GenericEnumType contain a "valueType" that is created by parser? Probably.
      const itemType: OmniPrimitiveType = {
        name: `ValueOfEnum${Naming.unwrap(type.name)}`,
        kind: OmniTypeKind.PRIMITIVE,
        primitiveKind: type.primitiveKind
      };

      const fieldType = new Java.Type(itemType);
      const fieldIdentifier = new Java.Identifier('value');
      const field = new Java.Field(
        fieldType,
        fieldIdentifier,
        undefined
      );

      body.children.push(field);

      body.children.push(
        new Java.ConstructorDeclaration(
          enumDeclaration,
          new Java.ArgumentDeclarationList(
            new Java.ArgumentDeclaration(
              fieldType,
              fieldIdentifier
            )
          ),
          new Java.Block(
            new Java.Statement(
              new Java.AssignExpression(
                new Java.FieldReference(field),
                new Java.VariableReference(fieldIdentifier)
              )
            )
          )
        )
      );
    }

    root.children.push(new Java.CompilationUnit(
      new Java.PackageDeclaration(options.package),
      new Java.ImportList(
        [] // TODO: Add the actual imports here. Visit all nodes of 'javaClass' and gather all types!
      ),
      enumDeclaration
    ));
  }

  /**
   * TODO: Merge functionality for object and composition
   */
  private transformObject(
    model: OmniModel,
    type: OmniObjectType | OmniCompositionType,
    options: JavaOptions,
    root: JavaCstRootNode,
    graph: DependencyGraph,
    genericTypes?: OmniGenericSourceIdentifierType[]
  ): void {

    // TODO: This could be an interface, if it's only extended from, and used in multiple inheritance.
    //        Make use of the DependencyGraph to figure things out...
    const body = new Java.Block();

    if (type.kind == OmniTypeKind.OBJECT) {

      if (type.properties) {
        for (const property of type.properties) {
          this.transformObjectProperty(model, body, property, options);
        }
      }

      if (type.additionalProperties) {

        if (!JavaDependencyGraph.superMatches(graph, type, parent => parent.additionalProperties == true)) {

          // No parent implements additional properties, so we should.
          body.children.push(new Java.AdditionalPropertiesDeclaration());
        }
      }
    }

    const javaClassName = Naming.unwrap(type.name);
    const javaType = new Java.Type(type);

    let declaration: Java.ClassDeclaration | Java.GenericClassDeclaration;
    if (genericTypes) {
      declaration = new Java.GenericClassDeclaration(
        new Java.Identifier(javaClassName),
        javaType,
        new Java.GenericTypeDeclarationList(
          genericTypes.map(it => new Java.GenericTypeDeclaration(
            new Java.Identifier(Naming.unwrap(it.name)),
            it.lowerBound ? new Java.Type(it.lowerBound) : undefined,
            it.upperBound ? new Java.Type(it.upperBound) : undefined,
          ))
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
    declaration.annotations = new Java.AnnotationList(
      new Java.Annotation(
        new Java.Type({kind: OmniTypeKind.REFERENCE, fqn: 'javax.annotation.Generated', name: 'Generated'}),
        new Java.AnnotationKeyValuePairList(
          new Java.AnnotationKeyValuePair(
            new Java.Identifier('value'),
            new Java.Literal('omnigen')
          ),
          new Java.AnnotationKeyValuePair(
            new Java.Identifier('date'),
            new Java.Literal(new Date().toISOString())
          )
        )
      )
    )

    const comments = this.getCommentsForType(type, model, options);

    if (type.kind == OmniTypeKind.COMPOSITION && type.compositionKind == CompositionKind.XOR) {

        // The composition type is XOR, it can only be one of them.
        // That is not possible to represent in Java, so we need another way of representing it.
        // Order of importance is:
        // 1. Using discriminator.propertyName and mapping (By Json fasterxml subtypes)
        // 2. Using discriminator.propertyName and schema ref name (if mapping does not exist) (By Json fasterxml subtypes)
        // 3. Trial and error by saving content as a string, and then trying different options (in a sorted order of hopeful exclusivity)

        const mappedTypes = [...type.mappings.values()];
        const unmapped = type.types.filter(it => !mappedTypes.includes(it));
        if (unmapped.length > 0) {

          // This means the specification did not have any discriminators.
          // Instead we need to figure out what it is in runtime. To be improved.
          body.children.push(
            new Java.RuntimeTypeMapping(type.types, options, (t) => this.getCommentsForType(t, model, options))
          );

        } else {

          // The specification did map all types using a discriminator.
          // So we can just Jackson annotations (or whatever) to hint what class it should be deserialized as.
          comments.push(new Java.Comment(`This bad boy can be mapped so hard`));
        }
    } else {

      const typeExtends = JavaDependencyGraph.getExtends(graph, type);
      if (typeExtends) {
        declaration.extends = new Java.ExtendsDeclaration(
          this.getTypeNodeWithGenerics(typeExtends)
        );
      }

      const typeImplements = JavaDependencyGraph.getImplements(graph, type);
      if (typeImplements.length > 0) {
        declaration.implements = new Java.ImplementsDeclaration(
          new Java.TypeList(typeImplements.map(it => this.getTypeNodeWithGenerics(it)))
        );
      }
    }

    if (comments.length > 0) {
      declaration.comments = new Java.CommentList(...comments);
    }

    root.children.push(new Java.CompilationUnit(
      new Java.PackageDeclaration(options.package),
      new Java.ImportList(
        [] // TODO: Add the actual imports here. Visit all nodes of 'javaClass' and gather all types!
      ),
      declaration
    ));
  }

  private getTypeNodeWithGenerics(typeExtends: OmniType): Java.Type {

    return new Java.Type(typeExtends);
  }

  private transformObjectProperty(model: OmniModel, body: Block, property: OmniProperty, options: JavaOptions): void {

    const comments: Java.Comment[] = [];
    if (property.type.kind != OmniTypeKind.OBJECT) {

      // If the type is not an object, then we will never create a class just for its sake.
      // So we should propagate all the examples and all other data we can find about it, to the property's comments.
      comments.push(...this.getCommentsForType(property.type, model, options));

      if (property.type.kind == OmniTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

        const staticArrayStrings = property.type.properties.map((prop, idx) => {
          const typeName = JavaUtil.getFullyQualifiedName(prop.type);
          const parameterName = prop.name;
          const description = prop.description || prop.type.description;
          return `[${idx}] ${typeName} ${parameterName}${(description ? ` - ${description}` : '')}`;
        });

        comments.push(new Java.Comment(`Array with parameters in this order:\n${staticArrayStrings.join('\n')}`));
      }
    }

    if (property.description) {
      comments.push(new Java.Comment(property.description));
    }

    if (property.summary) {
      comments.push(new Java.Comment(property.summary));
    }

    if (property.deprecated) {
      comments.push(new Java.Comment('@deprecated'));
    }

    if (property.required) {
      comments.push(new Java.Comment('Required'));
    }

    comments.push(...this.getLinkCommentsForProperty(property, model, options));

    const commentList = (comments.length > 0) ? new Java.CommentList(...comments) : undefined;

    if (property.type.kind == OmniTypeKind.NULL) {

      if (options.includeAlwaysNullProperties) {

        // We're told to include it, even though it always returns null.
        const methodDeclaration = new Java.MethodDeclaration(
          this.toJavaType(property.type),
          new Java.Identifier(JavaUtil.getGetterName(property.name, property.type), property.name),
          undefined,
          undefined,
          new Java.Block(
            new Java.Statement(new Java.ReturnStatement(new Java.Literal(null))),
          )
        );

        methodDeclaration.comments = commentList;
        body.children.push(methodDeclaration);
      }

      return;
    }

    if (property.type.kind == OmniTypeKind.PRIMITIVE && property.type.valueConstant) {

      if (typeof property.type.valueConstant == 'function') {

        // This constant is dynamic based on the type that the property is owned by.
        const field = new Java.Field(
          new Java.Type(property.type),
          new Java.Identifier(`_${camelCase(property.name)}`),
          new Java.ModifierList(
            new Java.Modifier(Java.ModifierType.PRIVATE),
            new Java.Modifier(Java.ModifierType.FINAL)
          )
        )

        const methodDeclaration = new Java.MethodDeclaration(
          new Java.Type(property.type),
          new Java.Identifier(JavaUtil.getGetterName(property.name, property.type), property.name),
          undefined,
          undefined,
          new Java.Block(
            new Java.Statement(new Java.ReturnStatement(
              new Java.FieldReference(field)
            )),
          )
        );

        methodDeclaration.comments = commentList;
        body.children.push(field);
        body.children.push(methodDeclaration);

      } else {
        const methodDeclaration = new Java.MethodDeclaration(
          new Java.Type(property.type),
          new Java.Identifier(JavaUtil.getGetterName(property.name, property.type), property.name),
          undefined,
          undefined,
          new Java.Block(
            new Java.Statement(new Java.ReturnStatement(new Java.Literal(property.type.valueConstant))),
          )
        );

        methodDeclaration.comments = commentList;
        body.children.push(methodDeclaration);
      }

      return;
    }

    // TODO: Move this to another transformer which checks for differences between field name and original name.
    const getterAnnotations: Java.Annotation[] = [];
    if (property.fieldName || property.propertyName) {
      getterAnnotations.push(
        new Java.Annotation(
          new Java.Type({kind: OmniTypeKind.REFERENCE, fqn: 'com.fasterxml.jackson.annotation.JsonProperty', name: 'JsonProperty'}),
          new Java.AnnotationKeyValuePairList(
            new Java.AnnotationKeyValuePair(
              undefined,
              new Java.Literal(property.name)
            )
          )
        )
      );
    }

    const getterAnnotationList = (getterAnnotations.length > 0)
      ? new Java.AnnotationList(...getterAnnotations)
      : undefined;

    const fieldType = this.toJavaType(property.type);
    const fieldIdentifier = new Java.Identifier(property.fieldName || camelCase(property.name), property.name);
    const getterIdentifier = property.propertyName
      ? new Java.Identifier(JavaUtil.getGetterName(property.propertyName, property.type))
      : undefined;

    if (options.immutableModels) {
      const field = new Java.Field(
        fieldType,
        fieldIdentifier,
        new Java.ModifierList(
          new Java.Modifier(ModifierType.PRIVATE),
          new Java.Modifier(ModifierType.FINAL)
        )
      );
      body.children.push(field);
      body.children.push(new Java.FieldBackedGetter(field, getterAnnotationList, commentList, getterIdentifier));
    } else {
      body.children.push(new Java.FieldGetterSetter(
        fieldType,
        fieldIdentifier,
        getterAnnotationList,
        commentList,
        getterIdentifier
      ));
    }
  }

  private getCommentsForType(type: OmniType, model: OmniModel, options: JavaOptions): Java.Comment[] {
    const comments: Java.Comment[] = [];
    if (type.description) {
      comments.push(new Java.Comment(type.description));
    }
    if (type.summary) {
      comments.push(new Java.Comment(type.summary));
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
              comments.push(new Java.Comment(property.description));
            }
            if (property.summary) {
              comments.push(new Java.Comment(property.summary));
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
            comments.push(new Java.Comment(`<section>\n<h2>${response.name}</h2>`));

            if (response.description) {
              comments.push(new Java.Comment(response.description));
            }
            if (response.summary) {
              comments.push(new Java.Comment(response.summary));
            }

            comments.push(new Java.Comment(`</section>`));
          }
        }
      }

      for (const example of endpoint.examples) {

        const parameterHasType = (example.params || []).filter(it => it.type == type).length > 0;
        if (example.result.type == type || parameterHasType) {
          comments.push(...this.getExampleComments(example, options));
        }
      }
    }

    comments.push(...this.getLinkCommentsForType(type, model, options));

    return comments;
  }

  private getLinkCommentsForType(type: OmniType, model: OmniModel, options: JavaOptions): Java.Comment[] {
    const comments: Java.Comment[] = [];
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
          comments.push(new Java.Comment("<section>\n<h2>Links</h2>"));
          comments.push(...continuation.mappings.map(mapping => {
            return this.getMappingSourceTargetComment(mapping, options);
          }));
          comments.push(new Java.Comment("</section>"));
        }
      }
    }

    return comments;
  }

  private getLinkCommentsForProperty(property: OmniProperty, model: OmniModel, options: JavaOptions): Java.Comment[] {
    const comments: Java.Comment[] = [];
    if (!options.includeLinksOnProperty) {
      return comments;
    }

    const linkComments: string[] = [];
    for (const continuation of (model.continuations || [])) {
      for (const mapping of continuation.mappings) {
        if (mapping.source.propertyPath?.length) {
          if (mapping.source.propertyPath[mapping.source.propertyPath.length - 1] == property) {
            linkComments.push(this.getMappingSourceTargetComment(mapping, options, 'target').text);
          }
        }

        if (mapping.target.propertyPath.length) {
          if (mapping.target.propertyPath[mapping.target.propertyPath.length - 1] == property) {
            linkComments.push(this.getMappingSourceTargetComment(mapping, options, 'source').text);
          }
        }
      }
    }

    if (linkComments.length > 0) {
      comments.push(new Java.Comment(linkComments.join('\n')));
    }

    return comments;
  }

  private getLink(propertyOwner: OmniType, property: OmniProperty, options: JavaOptions): string {

    const memberName = `${JavaUtil.getGetterName(property.name, property.type)}()`;
    return `{@link ${JavaUtil.getFullyQualifiedName(propertyOwner)}#${memberName}}`;
  }

  private getExampleComments(example: OmniExamplePairing, options: JavaOptions): Java.Comment[] {

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
        const propertyLink = this.getLink(param.property.owner, param.property, options);
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

    return [
      new Java.Comment(commentLines.join('\n  ')),
    ];
  }

  private getMappingSourceTargetComment(
    mapping: OmniLinkMapping,
    options: JavaOptions,
    only: 'source' | 'target' | undefined = undefined
  ): Java.Comment {

    const sourceLinks: string[] = [];
    const targetLinks: string[] = [];

    if (!only || only == 'source') {
      if (mapping.source.propertyPath) {
        const sourcePath = mapping.source.propertyPath || [];
        for (let i = 0; i < sourcePath.length; i++) {
          sourceLinks.push(this.getLink(sourcePath[i].owner, sourcePath[i], options));
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
            memberName = `${JavaUtil.getSetterName(prop.name, prop.type)}(${JavaUtil.getFullyQualifiedName(prop.type)})`
          }
        }

        targetLinks.push(`{@link ${typeName}#${memberName}}`);
      }
    }

    if (only == 'source') {
      return new Java.Comment(`@see Source ${sourceLinks.join('.')}`);
    } else if (only == 'target') {
      return new Java.Comment(`@see Use ${targetLinks.join('.')}`);
    } else {
      return new Java.Comment(`Source: ${sourceLinks.join('.')}\nTarget: ${targetLinks.join('.')}`);
    }
  }

  private toJavaType(type: OmniType): Java.Type {
    return new Java.Type(type);
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
                ...{
                  nullable: true
                }
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

  private replaceTypeWithReference(target: OmniType, primitiveType: OmniPrimitiveType, primitiveClass: Java.ClassDeclaration, options: JavaOptions): void {

    // TODO: Replace this with something else? REFERENCE should be for native classes, but this is sort of not?
    target.kind = OmniTypeKind.REFERENCE;

    const referenceType = target as OmniReferenceType;

    referenceType.fqn = `${options.package}.Primitive${pascalCase(JavaUtil.getPrimitiveKindName(primitiveType))}`;
  }
}
