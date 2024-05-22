import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import * as Java from '../ast/JavaAst';
import {OmniTypeKind} from '@omnigen/core';
import {JavaUtil} from '../util';

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
          new Java.MethodDeclarationSignature(
            n.getterName ?? new Java.Identifier(JavaUtil.getGetterName(field.identifier.value, field.type.omniType)),
            field.type,
            undefined,
            undefined,
            n.annotations,
            n.comments,
          ),
          new Java.Block(
            new Java.Statement(new Java.ReturnStatement(n.fieldRef)),
          ),
        );
      },
      reduceFieldBackedSetter: (n, r) => {

        const field = args.root.resolveNodeRef(n.fieldRef);

        const parameter = new Java.Parameter(
          field.type,
          field.identifier,
        );

        return new Java.MethodDeclaration(
          new Java.MethodDeclarationSignature(
            new Java.Identifier(JavaUtil.getSetterName(field.identifier.value)),
            new Java.EdgeType({
              kind: OmniTypeKind.VOID,
              nullable: true,
            }),
            new Java.ParameterList(parameter),
            undefined,
            n.annotations,
            n.comments,
          ),
          new Java.Block(
            new Java.Statement(
              new Java.AssignExpression(
                n.fieldRef,
                new Java.DeclarationReference(parameter),
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
