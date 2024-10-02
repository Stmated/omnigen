import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer';
import * as Java from '../ast/JavaAst';
import {OmniTypeKind} from '@omnigen/api';
import {LoggerFactory} from '@omnigen/core-log';
import {CodeAstUtils} from '@omnigen/target-code';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Replace generic things like "getter" and "setter" into specific nodes for Java (such as methods)
 */
export class MiscNodesToSpecificJavaAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const newRoot = args.root.reduce({
      ...args.root.createReducer(),
      reduceFieldBackedGetter: n => {

        const field = args.root.resolveNodeRef(n.fieldRef);

        return new Java.MethodDeclaration(
          new Java.MethodDeclarationSignature(
            new Java.GetterIdentifier(CodeAstUtils.getFieldPropertyNameIdentifier(field), field.type.omniType),
            field.type,
            undefined,
            undefined,
            n.annotations,
            n.comments,
          ),
          new Java.Block(
            new Java.Statement(new Java.ReturnStatement(new Java.MemberAccess(new Java.SelfReference(), n.fieldRef))),
          ),
        );
      },
      reduceFieldBackedSetter: n => {

        const field = args.root.resolveNodeRef(n.fieldRef);

        const parameter = new Java.Parameter(
          field.type,
          field.identifier,
        );

        return new Java.MethodDeclaration(
          new Java.MethodDeclarationSignature(
            new Java.SetterIdentifier(CodeAstUtils.getFieldPropertyNameIdentifier(field), field.type.omniType),
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
              new Java.BinaryExpression(
                n.fieldRef,
                Java.TokenKind.ASSIGN,
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
