import {OmniInterfaceType, OmniTypeKind} from '@parse';
import {JavaUtil} from '@java';
import * as Java from '@java/cst';

export class JavaCstUtils {

  public static addInterfaceProperties(type: OmniInterfaceType, body: Java.Block): void {

    if (type.of.kind == OmniTypeKind.OBJECT) {

      // Transform the object, but add no fields and only add the abstract method declaration (signature only)
      for (const property of type.of.properties) {
        body.children.push(
          new Java.AbstractMethodDeclaration(
            new Java.MethodDeclarationSignature(
              new Java.Identifier(JavaUtil.getGetterName(property.propertyName || property.name, property.type)),
              new Java.Type(property.type, false)
            )
          )
        );
      }
    }
  }

  public static addGeneratedAnnotation(declaration: Java.AbstractObjectDeclaration): void {

    if (!declaration.annotations) {
      declaration.annotations = new Java.AnnotationList(...[]);
    }

    declaration.annotations.children.push(
      new Java.Annotation(
        new Java.Type({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'javax.annotation.Generated'}),
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
    );
  }
}
