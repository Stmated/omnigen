import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.js';
import {OmniTypeKind} from '@omnigen/core';
import * as Java from '../ast/index.js';
import {VisitorFactoryManager} from '@omnigen/core-util';

export class PropertyNameDiscrepancyAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): Promise<void> {

    // TODO: Add @JsonProperty to the constructor parameters?

    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitMethodDeclaration: () => {},
      visitExtendsDeclaration: () => {},
      visitConstructor: () => {},
      visitAnnotation: () => {},
      visitImportList: () => {},

      visitField: node => {

        const fieldName = node.identifier.value;
        let jsonFieldName: string;
        if (node.property) {
          jsonFieldName = node.property.name;
        } else {
          jsonFieldName = node.identifier.original || node.identifier.value;
        }

        if (fieldName != jsonFieldName) {

          const annotations = node.annotations || new Java.AnnotationList(...[]);

          annotations.children.push(new Java.Annotation(
            new Java.RegularType({kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: 'com.fasterxml.jackson.annotation.JsonProperty'}),
            new Java.AnnotationKeyValuePairList(
              new Java.AnnotationKeyValuePair(
                undefined,
                new Java.Literal(jsonFieldName),
              ),
            ),
          ));

          node.annotations = annotations;
        }
      },
    }));

    return Promise.resolve();
  }
}
