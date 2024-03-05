import {OmniTypeKind} from '@omnigen/core';
import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from '../transform/index.js';
import * as Java from '../ast/index.js';
import {VisitorFactoryManager} from '@omnigen/core-util';

export class AddGeneratedAnnotationAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    if (!args.options.includeGeneratedAnnotation) {
      return;
    }

    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitCompilationUnit: node => {

        const declaration = node.object;

        if (!declaration.annotations) {
          declaration.annotations = new Java.AnnotationList(...[]);
        }

        // TODO: This should not be hardcoded as 'javax', it needs to be abe to be jakarta as well -- maybe convert this into an abstract node, converted in a later stage?
        declaration.annotations.children.push(
          new Java.Annotation(
            new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'javax.annotation.Generated'}),
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
