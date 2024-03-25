import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.js';
import {Java, JavaUtil} from '../';
import {AssignExpression, Block, DeclarationReference, EdgeType, Identifier, MethodDeclarationSignature, Parameter, ParameterList, ReturnStatement, Statement} from '../ast';
import {OmniPrimitiveKind, OmniTypeKind} from '@omnigen/core';

export class GenericNodesToSpecificJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const defaultReducer = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceFieldBackedGetter: (n, r) => {

        const field = args.root.getNodeWithId<Java.Field>(n.fieldRef.targetId);
        return new Java.MethodDeclaration(
          new MethodDeclarationSignature(
            n.getterName ?? new Identifier(JavaUtil.getGetterName(field.identifier.value, field.type.omniType)),
            field.type,
            undefined,
            undefined,
            n.annotations,
            n.comments,
          ),
          new Block(
            new Statement(new ReturnStatement(n.fieldRef)),
          ),
        );
      },
      reduceFieldBackedSetter: (n, r) => {

        const field = args.root.getNodeWithId<Java.Field>(n.fieldRef.targetId);

        const parameter = new Parameter(
          field.type,
          field.identifier,
        );

        return new Java.MethodDeclaration(
          new MethodDeclarationSignature(
            new Identifier(JavaUtil.getSetterName(field.identifier.value)),
            new EdgeType({
              kind: OmniTypeKind.PRIMITIVE,
              primitiveKind: OmniPrimitiveKind.VOID,
              nullable: true,
            }),
            new ParameterList(parameter),
            undefined,
            n.annotations,
            n.comments,
          ),
          new Block(
            new Statement(
              new AssignExpression(
                n.fieldRef,
                new DeclarationReference(parameter),
              ),
            ),
          ),
        );
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

}
