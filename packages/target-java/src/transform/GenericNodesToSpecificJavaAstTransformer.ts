import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {Java, JavaUtil} from '../';
import {AssignExpression, Block, DeclarationReference, EdgeType, Identifier, MethodDeclarationSignature, Parameter, ParameterList, ReturnStatement, Statement} from '../ast';
import {OmniTypeKind} from '@omnigen/core';

/**
 * Replace generic things like "getter" and "setter" into specific nodes for Java (such as methods)
 */
export class GenericNodesToSpecificJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const newRoot = args.root.reduce({
      ...args.root.createReducer(),
      reduceFieldBackedGetter: (n, r) => {

        const field = args.root.resolveNodeRef(n.fieldRef);
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

        const field = args.root.resolveNodeRef(n.fieldRef);

        const parameter = new Parameter(
          field.type,
          field.identifier,
        );

        return new Java.MethodDeclaration(
          new MethodDeclarationSignature(
            new Identifier(JavaUtil.getSetterName(field.identifier.value)),
            new EdgeType({
              kind: OmniTypeKind.VOID,
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
