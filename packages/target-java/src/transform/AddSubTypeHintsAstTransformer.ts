import {AstTransformer, AstTransformerArguments, OmniTypeKind} from '@omnigen/core';
import {OmniUtil, VisitorFactoryManager} from '@omnigen/core-util';
import {Code} from '@omnigen/target-code';

export class AddSubTypeHintsAstTransformer implements AstTransformer<Code.CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<Code.CodeRootAstNode>): void {

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

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
            new Code.Annotation(
              new Code.EdgeType({
                kind: OmniTypeKind.HARDCODED_REFERENCE,
                fqn: {namespace: ['com', 'fasterxml', 'jackson', 'annotation'], edgeName: 'JsonTypeInfo'},
              }),
              new Code.AnnotationKeyValuePairList(
                new Code.AnnotationKeyValuePair(
                  new Code.Identifier('use'),
                  new Code.StaticMemberReference(
                    new Code.ClassName(
                      new Code.EdgeType({
                        kind: OmniTypeKind.HARDCODED_REFERENCE,
                        fqn: {namespace: ['com', 'fasterxml', 'jackson', 'annotation', {name: 'JsonTypeInfo', nested: true}], edgeName: 'Id'},
                      }),
                    ),
                    new Code.Identifier(
                      'NAME',
                    ),
                  ),
                ),
                new Code.AnnotationKeyValuePair(
                  new Code.Identifier('property'),
                  new Code.Literal(propertyName),
                ),
              ),
            ),
          );

          const subTypes: Code.Annotation[] = [];
          for (const subTypeHint of node.type.omniType.subTypeHints) {

            const qualifier = subTypeHint.qualifiers[0];
            subTypes.push(new Code.Annotation(
              new Code.EdgeType({
                kind: OmniTypeKind.HARDCODED_REFERENCE,
                fqn: {namespace: ['com', 'fasterxml', 'jackson', 'annotation', {name: 'JsonSubTypes', nested: true}], edgeName: 'Type'},
              }),
              new Code.AnnotationKeyValuePairList(
                new Code.AnnotationKeyValuePair(
                  new Code.Identifier('name'),
                  new Code.Literal(OmniUtil.toLiteralValue(qualifier.value)),
                ),
                new Code.AnnotationKeyValuePair(
                  new Code.Identifier('value'),
                  new Code.ClassReference(new Code.ClassName(args.root.getAstUtils().createTypeNode(subTypeHint.type))),
                ),
              ),
            ));
          }

          node.annotations?.children.push(
            new Code.Annotation(
              new Code.EdgeType({
                kind: OmniTypeKind.HARDCODED_REFERENCE,
                fqn: {namespace: ['com', 'fasterxml', 'jackson', 'annotation'], edgeName: 'JsonSubTypes'},
              }),
              new Code.AnnotationKeyValuePairList(
                new Code.AnnotationKeyValuePair(
                  undefined,
                  new Code.ArrayInitializer<Code.Annotation>(
                    ...subTypes,
                  ),
                ),
              ),
            ),
          );
        }
      },
    }));
  }
}
