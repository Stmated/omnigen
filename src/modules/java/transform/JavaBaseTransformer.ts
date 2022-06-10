import {AbstractJavaTransformer} from './AbstractJavaTransformer';
import {Block, FieldReference, JavaCstRootNode, JavaOptions, JavaUtil, ReturnStatement} from '@java';
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
      } else {
        this.transformObject(type, options, root);
      }

      // TODO: Find enum
      // TODO: Find interface
    }

    return Promise.resolve();
  }

  private transformObject(type: GenericClassType, options: JavaOptions, root: JavaCstRootNode): void {

    // TODO: This could be an interface, if it's only extended from, and used in multiple inheritance
    const body = new Java.Block();
    if (type.properties) {
      for (const property of type.properties) {
        if (property.type.kind == GenericTypeKind.NULL) {

          if (options.includeAlwaysNullProperties) {

            // We're told to include it, even though it always returns null.
            body.children.push(new Java.MethodDeclaration(
              new Java.Type(property.type),
              new Java.Identifier(JavaUtil.getGetterName(property.name, property.type)),
              undefined,
              undefined,
              new Java.Block(
                new Java.ReturnStatement(new Java.Literal(null)),
              )
            ));
          }

          continue;
        }

        if (property.type.kind == GenericTypeKind.PRIMITIVE && property.type.valueConstant) {

          body.children.push(new Java.MethodDeclaration(
            new Java.Type(property.type),
            new Java.Identifier(JavaUtil.getGetterName(property.name, property.type)),
            undefined,
            undefined,
            new Java.Block(
              new Java.ReturnStatement(new Java.Literal(property.type.valueConstant)),
            )
          ));

          continue;
        }

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

  private toJavaType(type: GenericType): Java.Type {
    return new Java.Type(type);
  }
}
