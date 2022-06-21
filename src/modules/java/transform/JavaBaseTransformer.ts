import {AbstractJavaTransformer} from './AbstractJavaTransformer';
import {JavaCstRootNode, JavaOptions, JavaUtil, ModifierType} from '@java';
import {
  CompositionKind,
  GenericClassType,
  GenericContinuationMapping,
  GenericExamplePairing,
  GenericModel,
  GenericProperty,
  GenericType,
  GenericTypeKind
} from '@parse';
import * as Java from '@java/cst';
import {camelCase, pascalCase} from 'change-case';

export class JavaBaseTransformer extends AbstractJavaTransformer {
  private static readonly PATTERN_IDENTIFIER = new RegExp(/\b[_a-zA-Z][_a-zA-Z0-9]*\b/);

  transform(model: GenericModel, root: JavaCstRootNode, options: JavaOptions): Promise<void> {

    // TODO: Move most of this to another transformer later
    // TODO: Investigate the types and see which ones should be interfaces, and which ones should be classes

    for (const type of model.types) {
      if (!JavaBaseTransformer.PATTERN_IDENTIFIER.test(type.name)) {
        // The type does not have a valid name; what can we do about it?
        throw new Error(`Type name '${type.name}' (${type.description || type.summary || type.kind}) is not valid`);
      } else {
        // The type has a valid name, but we will make sure it is in PascalCase for Java.
        const pascalName = pascalCase(type.name);
        if (pascalName !== type.name) {
          type.name = pascalName;
        }
      }
    }

    for (const type of model.types) {

      if (type.kind == GenericTypeKind.ARRAY) {

        // What do we do here?

      } else if (type.kind == GenericTypeKind.ENUM) {
        const body = new Java.Block();

        const enumDeclaration = new Java.EnumDeclaration(
          new Java.Type(type),
          new Java.Identifier(type.name),
          body,
        );

        root.children.push(enumDeclaration);
      } else if (type.kind == GenericTypeKind.NULL) {

      } else if (type.kind == GenericTypeKind.PRIMITIVE) {

        // This is a primitive
      } else if (type.kind == GenericTypeKind.DICTIONARY) {

        // This is a map. What to do here? It's a top-level type, so...?
      } else if (type.kind == GenericTypeKind.REFERENCE) {

        // This is a map in the target language, which we have zero control over.
      } else if (type.kind == GenericTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

        // This is a list of static properties. This should modify the model, creating a marker interface?
        // Like an ISomethingOrOtherOrDifferent that contains the common properties, or is just empty?
        // (preferably they contain the ones in common, just because it's Nice).

      } else if (type.kind == GenericTypeKind.ARRAY_TYPES_BY_POSITION) {

        // This is a list of static types. This should modify the model, creating a marker interface?
        // Like an ISomethingOrOtherOrDifferent that contains the common properties, or is just empty?
        // (preferably they contain the ones in common, just because it's Nice).

      } else if (type.kind == GenericTypeKind.COMPOSITION) {

        // Should we do something here?

      } else {
        this.transformObject(model, type, options, root);
      }

      // TODO: Find enum
      // TODO: Find interface
    }

    return Promise.resolve();
  }

  private transformObject(model: GenericModel, type: GenericClassType, options: JavaOptions, root: JavaCstRootNode): void {

    // TODO: This could be an interface, if it's only extended from, and used in multiple inheritance
    const body = new Java.Block();

    if (type.properties) {
      for (const property of type.properties) {

        const comments: Java.Comment[] = [];
        if (property.type.kind != GenericTypeKind.OBJECT) {

          // If the type is not an object, then we will never create a class just for its sake.
          // So we should propagate all the examples and all other data we can find about it, to the property's comments.

          comments.push(...this.getCommentsForType(property.type, model, options));

          if (property.type.kind == GenericTypeKind.ARRAY_PROPERTIES_BY_POSITION) {

            const staticArrayStrings = property.type.properties.map((prop, idx) => {
              const typeName = JavaUtil.getFullyQualifiedName(prop.type);
              const parameterName = prop.name;
              const description = prop.description || prop.type.description;
              return `[${idx}] ${typeName} ${parameterName}${(description ? ` - ${description}` : '')}`;
            });

            comments.push(new Java.Comment(`Array with parameters in this order:\n${staticArrayStrings.join('\n')}`));
          }
        }

        comments.push(...this.getCommentsForProperty(property, model, options));

        const commentList = (comments.length > 0) ? new Java.CommentList(...comments) : undefined;

        if (property.type.kind == GenericTypeKind.NULL) {

          if (options.includeAlwaysNullProperties) {

            // We're told to include it, even though it always returns null.
            const methodDeclaration = new Java.MethodDeclaration(
              this.toJavaType(property.type),
              new Java.Identifier(JavaUtil.getGetterName(property.name, property.type), property.name),
              undefined,
              undefined,
              new Java.Block(
                new Java.ReturnStatement(new Java.Literal(null)),
              )
            );

            methodDeclaration.comments = commentList;
            body.children.push(methodDeclaration);
          }

          continue;
        }

        if (property.type.kind == GenericTypeKind.PRIMITIVE && property.type.valueConstant) {

          const methodDeclaration = new Java.MethodDeclaration(
            new Java.Type(property.type),
            new Java.Identifier(JavaUtil.getGetterName(property.name, property.type), property.name),
            undefined,
            undefined,
            new Java.Block(
              new Java.ReturnStatement(new Java.Literal(property.type.valueConstant)),
            )
          );

          methodDeclaration.comments = commentList;
          body.children.push(methodDeclaration);

          continue;
        }

        if (options.immutableModels) {
          const field = new Java.Field(
            this.toJavaType(property.type),
            new Java.Identifier(camelCase(property.name), property.name),
            new Java.ModifierList([
              new Java.Modifier(ModifierType.PRIVATE),
              new Java.Modifier(ModifierType.FINAL)
            ])
          );
          body.children.push(field);
          body.children.push(new Java.FieldBackedGetter(field, undefined, commentList));
        } else {
          body.children.push(new Java.FieldGetterSetter(
            this.toJavaType(property.type),
            new Java.Identifier(camelCase(property.name), property.name),
            undefined,
            commentList
          ));
        }
      }
    }

    if (type.additionalProperties) {

      // TODO: Need to implement this.
      //  Need an easy way of describing this, so it can be replaced or altered by another transformer.
      body.children.push(new Java.AdditionalPropertiesDeclaration());
    }

    const javaClass = new Java.ClassDeclaration(
      new Java.Type(type),
      new Java.Identifier(type.name),
      body,
    );

    const comments = this.getCommentsForType(type, model, options);

    if (type.extendedBy) {

      // TODO: Implement all this. For now, just write the stuff in comments

      comments.push(new Java.Comment(this.getCommentsDescribingExtensions(type.extendedBy) || ''));
    }

    if (comments.length > 0) {
      javaClass.comments = new Java.CommentList(...comments);
    }

    // if (type.extendsAllOf) {
    //   if (type.extendsAllOf.length == 1) {
    //     javaClass.extends = new Java.ExtendsDeclaration(
    //       new Java.Type(type.extendsAllOf[0])
    //     );
    //   } else {
    //
    //     const types = type.extendsAllOf.map(it => new Java.Type(it));
    //     javaClass.implements = new Java.ImplementsDeclaration(
    //       new Java.TypeList(types)
    //     );
    //   }
    // }

    root.children.push(new Java.CompilationUnit(
      new Java.PackageDeclaration(options.package),
      new Java.ImportList(
        [] // TODO: Add the actual imports here. Visit all nodes of 'javaClass' and gather all types!
      ),
      javaClass
    ));
  }

  private getCommentsDescribingExtensions(type: GenericType): string {

    /*
    if (type.kind == GenericTypeKind.COMPOSITION) {

      if (type.compositionKind == CompositionKind.AND) {

      } else if (type.compositionKind == CompositionKind.OR) {

      } else if (type.compositionKind == CompositionKind.XOR) {

      } else if (type.compositionKind == CompositionKind.NOT) {

      }

    } else {*/
      return type.name;
    //}
  }

  private getCommentsForType(type: GenericType, model: GenericModel, options: JavaOptions): Java.Comment[] {
    const comments: Java.Comment[] = [];
    if (type.description) {
      comments.push(new Java.Comment(type.description));
    }
    if (type.summary) {
      comments.push(new Java.Comment(type.summary));
    }

    for (const endpoint of model.endpoints) {

      // TODO: Redo so they are only linked by "@see" and stuff?
      // TODO: Is it even correct to go through the properties?
      // TODO: Should this be more generic, to have a sort of "visitor" for all types of a GenericModel?
      if (endpoint.request.type.kind == GenericTypeKind.OBJECT && endpoint.request.type.properties) {
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
        if (response.type == type) {

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

  private getLinkCommentsForType(type: GenericType, model: GenericModel, options: JavaOptions): Java.Comment[] {
    const comments: Java.Comment[] = [];
    if (!options.includeLinksOnType) {
      return comments;
    }

    if (type.kind == GenericTypeKind.OBJECT || type.kind == GenericTypeKind.ARRAY_PROPERTIES_BY_POSITION) {
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

  private getCommentsForProperty(property: GenericProperty, model: GenericModel, options: JavaOptions): Java.Comment[] {
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

  private getLink(propertyOwner: GenericType, property: GenericProperty, options: JavaOptions): string {

    const memberName = `${JavaUtil.getGetterName(property.name, property.type)}()`;
    return `{@link ${JavaUtil.getFullyQualifiedName(propertyOwner)}#${memberName}}`;
  }

  private getExampleComments(example: GenericExamplePairing, options: JavaOptions): Java.Comment[] {

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
    mapping: GenericContinuationMapping,
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

  private toJavaType(type: GenericType): Java.Type {
    return new Java.Type(type);
  }
}
