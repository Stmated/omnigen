import {AbstractJavaTransformer} from './AbstractJavaTransformer';
import {JavaCstRootNode, JavaOptions, JavaUtil, ModifierType} from '@java';
import {GenericClassType, GenericModel, GenericType, GenericTypeKind} from '@parse';
import * as Java from '@java/cst';
import {pascalCase} from 'change-case';

export class JavaBaseTransformer extends AbstractJavaTransformer {
  private static readonly PATTERN_IDENTIFIER = new RegExp(/\b[_a-zA-Z][_a-zA-Z0-9]*\b/);

  transform(model: GenericModel, root: JavaCstRootNode, options: JavaOptions): Promise<void> {

    // TODO: Move this to another transformer later
    // TODO: Investigate the types and see which ones should be interfaces, and which ones should be classes
    for (const type of model.types) {
      if (!JavaBaseTransformer.PATTERN_IDENTIFIER.test(type.name)) {
        // The type does not have a valid name, so we need to transform it.
        throw new Error(`Type name '${type.name}' is not valid`);
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
      } else if (type.kind == GenericTypeKind.ARRAY_STATIC) {

        // This is a list of static types. This should modify the model, creating a marker interface.
        // Like an ISomethingOrOtherOrDifferent that contains the common properties, or is just empty.
        // (preferably they contain the ones in common, just because it's Nice).

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
    const fieldsForConstructor: Java.Field[] = []; // Java.ArgumentDeclarationList = new Java.ArgumentDeclarationList();

    if (type.properties) {
      for (const property of type.properties) {

        const comments: Java.Comment[] = [];
        if (property.type.kind != GenericTypeKind.OBJECT) {

          // If the type is not an object, then we will never create a class just for its sake.
          // So we should propagate all the examples and all other data we can find about it, to the property's comments.

          comments.push(...this.getCommentsForType(property.type, model));

          if (property.type.kind == GenericTypeKind.ARRAY_STATIC) {
            comments.push(new Java.Comment(`Array with parameters in this order:\n${property.type.of.map((it, idx) => {
              const typeName = JavaUtil.getFullyQualifiedName(it.type);
              const parameterName = it.name;
              const description = it.description || it.type.description;
              return `[${idx}] ${typeName} ${parameterName}${(description ? ` - ${description}` : '')}`;
            }).join('\n')}`));
          }
        }

        const commentList = (comments.length > 0) ? new Java.CommentList(...comments) : undefined;

        if (property.type.kind == GenericTypeKind.NULL) {

          if (options.includeAlwaysNullProperties) {

            // We're told to include it, even though it always returns null.
            const methodDeclaration = new Java.MethodDeclaration(
              this.toJavaType(property.type),
              new Java.Identifier(JavaUtil.getGetterName(property.name, property.type)),
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
            new Java.Identifier(JavaUtil.getGetterName(property.name, property.type)),
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
            new Java.Identifier(property.name),
            new Java.ModifierList([
              new Java.Modifier(ModifierType.PRIVATE),
              new Java.Modifier(ModifierType.FINAL)
            ])
          );
          body.children.push(field);
          body.children.push(new Java.FieldBackedGetter(field, undefined, commentList));

          fieldsForConstructor.push(field);
        } else {
          body.children.push(new Java.FieldGetterSetter(
            this.toJavaType(property.type),
            new Java.Identifier(property.name),
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
      new Java.Identifier(type.name),
      body,
    );

    const comments = this.getCommentsForType(type, model);
    if (comments.length > 0) {
      javaClass.comments = new Java.CommentList(...comments);
    }

    if (fieldsForConstructor.length > 0) {

      // TODO: Move this into another transformer
      //  One that checks for "final" fields without setters, and adds a constructor.
      //  This is much more dynamic and could be called by an implementor at another stage.
      const assignExpressions = fieldsForConstructor.map(it => new Java.AssignExpression(
        new Java.FieldReference(it),
        new Java.VariableReference(it.identifier)
      ));

      body.children.push(new Java.ConstructorDeclaration(
        javaClass,
        new Java.ArgumentDeclarationList(
          // TODO: Can this be handled in a better way?
          //  To intrinsically link the argument to the field? A "FieldBackedArgumentDeclaration"? Too silly?
          ...fieldsForConstructor.map(it => new Java.ArgumentDeclaration(it.type, it.identifier))
        ),
        new Java.Block(...assignExpressions)
      ))
    }

    if (type.extendsAllOf) {
      if (type.extendsAllOf.length == 1) {
        javaClass.extends = new Java.ExtendsDeclaration(
          new Java.Type(type.extendsAllOf[0])
        );
      } else {

        const types = type.extendsAllOf.map(it => new Java.Type(it));
        javaClass.implements = new Java.ImplementsDeclaration(
          new Java.TypeList(types)
        );
      }
    }

    root.children.push(new Java.CompilationUnit(
      new Java.PackageDeclaration(options.package),
      new Java.ImportList(
        [] // TODO: Add the actual imports here. Visit all nodes of 'javaClass' and gather all types!
      ),
      javaClass
    ));
  }

  private getCommentsForType(type: GenericType, model: GenericModel): Java.Comment[] {
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

          response.type
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
        if (example.result.type == type) {

          comments.push(new Java.Comment(`<section>\n<h2>${example.name} - ${example.result.name}</h2>`));

          if (example.description) {
            comments.push(new Java.Comment(example.description));
          }
          if (example.summary) {
            comments.push(new Java.Comment(example.summary));
          }

          if (example.result.description) {
            comments.push(new Java.Comment(example.result.description));
          }
          if (example.result.summary) {
            comments.push(new Java.Comment(example.result.summary));
          }

          // WRONG CLASS!
          if (example.result.value) {

            let prettyValue: string;
            if (typeof example.result.value == 'string') {
              prettyValue = example.result.value;
            } else {
              prettyValue = JSON.stringify(example.result.value, null, 2);
            }

            comments.push(new Java.Comment(`<pre>{@code ${prettyValue}}</pre>`));
          }

          comments.push(new Java.Comment(`</section>`));
        }
      }
    }

    return comments;
  }

  private toJavaType(type: GenericType): Java.Type {
    return new Java.Type(type);
  }
}
