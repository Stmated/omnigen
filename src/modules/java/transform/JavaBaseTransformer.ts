import {AbstractJavaTransformer} from './AbstractJavaTransformer';
import {JavaCstRootNode, JavaOptions} from '@java';
import {GenericModel, GenericType, GenericTypeKind} from '@parse';
import * as Java from '@java/cst';
import {pascalCase} from 'change-case';

export class JavaBaseTransformer extends AbstractJavaTransformer {
  private static readonly PATTERN_IDENTIFIER = new RegExp(/\b[_a-zA-Z][_a-zA-Z0-9]*\b/);

  transform(model: GenericModel, root: JavaCstRootNode, options: JavaOptions): Promise<void> {

    // TODO: Move this to another transformer later
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
      } else {
        // This is an object

        // TODO: This could be an interface, if it's only extended from, and used in multiple inheritance
        const body = new Java.Block();
        if (type.properties) {
          for (const property of type.properties) {
            if (options.immutableModels) {
              const field = new Java.Field(
                this.toJavaType(property.type),
                new Java.Identifier(property.name)
              );
              body.children.push(field);
              body.children.push(new Java.FieldBackedGetter(field));
            } else {
              body.children.push(new Java.FieldGetterSetter(
                this.toJavaType(property.type),
                new Java.Identifier(property.name),
              ));
            }
          }
        }

        const javaClass = new Java.ClassDeclaration(
          new Java.Identifier(type.name),
          body,
        );

        root.children.push(javaClass);
        if (type.nestedTypes) {

        }
      }

      // TODO: Find enum
      // TODO: Find interface
    }

    return Promise.resolve();
  }

  private toJavaType(type: GenericType): Java.Type {
    return new Java.Type(type);
  }
}
