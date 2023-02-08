import {
  OmniTypeKind,
} from '@omnigen/core';
import {AbstractJavaAstTransformer, JavaAstTransformerArgs, JavaAstUtils} from '../transform/index.js';
import * as Java from '../ast/index.js';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';

export class AddSubTypeHintsAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): Promise<void> {

    if (!args.options.includeGeneratedAnnotation) {
      return Promise.resolve();
    }

    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitObjectDeclaration: node => {

        if (node.type.omniType.kind == OmniTypeKind.OBJECT && node.type.omniType.subTypeHints) {

          // Instead of making the current class inherit from something,
          // We will with the help of external libraries note what kind of class this might be.
          // Goes against how polymorphism is supposed to work, in a way, but some webservices do it this way.
          // That way methods can receive an Abstract class, but be deserialized as the correct implementation.
          // See: https://swagger.io/docs/specification/data-models/inheritance-and-polymorphism/

          // We make use the the same property for all, since it is not supported in Java to have many different ones anyway.
          const propertyName = node.type.omniType.subTypeHints[0].qualifiers[0].path[0];

          // TODO: Need to figure out an actual way of handling the inheritance
          //         If "In" is itself empty and only inherits, then use "Abs" directly instead?
          //         What to do if that is not possible? Need to make it work as if "In" also has properties!

          node.annotations?.children.push(
            new Java.Annotation(
              new Java.RegularType({
                kind: OmniTypeKind.HARDCODED_REFERENCE,
                fqn: 'com.fasterxml.jackson.annotation.JsonTypeInfo',
              }),
              new Java.AnnotationKeyValuePairList(
                new Java.AnnotationKeyValuePair(
                  new Java.Identifier('use'),
                  new Java.StaticMemberReference(
                    new Java.ClassName(
                      new Java.RegularType({
                        kind: OmniTypeKind.HARDCODED_REFERENCE,
                        fqn: 'com.fasterxml.jackson.annotation.JsonTypeInfo.Id',
                      }),
                    ),
                    new Java.Identifier(
                      'NAME',
                    ),
                  ),
                ),
                new Java.AnnotationKeyValuePair(
                  new Java.Identifier('property'),
                  new Java.Literal(propertyName),
                ),
              ),
            ),
          );

          const subTypes: Java.Annotation[] = [];
          for (const subTypeHint of node.type.omniType.subTypeHints) {

            const qualifier = subTypeHint.qualifiers[0];
            subTypes.push(new Java.Annotation(
              new Java.RegularType({
                kind: OmniTypeKind.HARDCODED_REFERENCE,
                fqn: 'com.fasterxml.jackson.annotation.JsonSubTypes.Type',
              }),
              new Java.AnnotationKeyValuePairList(
                new Java.AnnotationKeyValuePair(
                  new Java.Identifier('name'),
                  new Java.Literal(OmniUtil.toLiteralValue(qualifier.value)),
                ),
                new Java.AnnotationKeyValuePair(
                  new Java.Identifier('value'),
                  new Java.ClassReference(JavaAstUtils.createTypeNode(subTypeHint.type)),
                ),
              ),
            ));
          }

          node.annotations?.children.push(
            new Java.Annotation(
              new Java.RegularType({
                kind: OmniTypeKind.HARDCODED_REFERENCE,
                fqn: 'com.fasterxml.jackson.annotation.JsonSubTypes',
              }),
              new Java.AnnotationKeyValuePairList(
                new Java.AnnotationKeyValuePair(
                  undefined,
                  new Java.ArrayInitializer<Java.Annotation>(
                    ...subTypes,
                  ),
                ),
              ),
            ),
          );
        }
      },
    }));

    return Promise.resolve(undefined);
  }
}
