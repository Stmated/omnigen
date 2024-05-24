import {ObjectName, OmniTypeKind} from '@omnigen/core';
import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from '../transform';
import * as Java from '../ast/JavaAst';
import {VisitorFactoryManager} from '@omnigen/core-util';
import {JavaAnnotationLibrary} from '../options';

export class AddGeneratedAnnotationJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    if (!args.options.includeGenerated) {
      return;
    }

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitObjectDeclaration: node => {

        if (!node.annotations) {
          node.annotations = new Java.AnnotationList(...[]);
        }

        let annotationFqn: ObjectName;
        switch (args.options.javaAnnotationLibrary) {
          case JavaAnnotationLibrary.JAKARTA:
            annotationFqn = args.root.getNameResolver().parse('jakarta.annotation.Generated');
            break;
          case JavaAnnotationLibrary.JAVAX:
            annotationFqn = args.root.getNameResolver().parse('javax.annotation.Generated');
            break;
        }

        // TODO: This should not be hardcoded as 'javax', it needs to be abe to be jakarta as well -- maybe convert this into an abstract node, converted in a later stage?
        node.annotations.children.push(
          new Java.Annotation(
            new Java.EdgeType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: annotationFqn}),
            new Java.AnnotationKeyValuePairList(
              new Java.AnnotationKeyValuePair(
                new Java.Identifier('value'),
                new Java.Literal('omnigen'),
              ),
              new Java.AnnotationKeyValuePair(
                new Java.Identifier('date'),
                new Java.Literal(new Date().toISOString()),
              ),
            ),
          ),
        );
      },
    }));
  }
}
