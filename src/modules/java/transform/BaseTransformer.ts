import {AbstractJavaTransformer} from './AbstractJavaTransformer';
import {JavaCstRootNode, JavaOptions} from '@java';
import {GenericTypeKind, GenericModel, GenericTypeOrGenericArrayType} from '@parse';
import * as Java from '@java/cst';

export class BaseTransformer extends AbstractJavaTransformer {
  transform(model: GenericModel, root: JavaCstRootNode, options: JavaOptions): void {
    //const javaOptions: JavaOptions = JavaGenerator.defaultOptions;

    for (const type of model.types) {
      // const model = model.models[modelKey];

      if (type.kind == GenericTypeKind.ENUM) {
        //const oldEnumRenderer = new EnumRenderer(javaOptions, new JavaGenerator(javaOptions), [], type, type);
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
            body.children.push(new Java.FieldGetterSetter(
              this.toJavaType(property.type),
              new Java.Identifier(property.name),
            ));
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

      //const kind = TypeHelpers.extractKind(type);
      /*
      if (kind === ModelKind.OBJECT || kind === ModelKind.UNION) {
      }
      */

      // TODO: Find enum
      // TODO: Find interface
    }
  }

  private toJavaType(type: GenericTypeOrGenericArrayType): Java.Type {
    if ('of' in type) {
      // This is an array.
      // TODO: If it's a nested array, things will get weird. No idea yet how we should handle that.
      const javaType = this.toJavaType(type.of);
      return new Java.Type(javaType.fqn, true);
    } else {
      return new Java.Type(type.name, false);
    }
  }
}
