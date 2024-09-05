import {AstNode, AstTransformer, AstTransformerArguments, OmniPrimitiveBaseType, OmniType} from '@omnigen/api';
import {OmniUtil, ReferenceNodeNotFoundError} from '@omnigen/core';
import {CodeRootAstNode} from '../CodeRootAstNode.ts';
import * as Code from '../CodeAst';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

/**
 * If a function has the signature `foo(bar: 'baz')` ie. `bar` can only ever take `'baz'`, then we should remove it and fix all callers.
 */
export class RemoveConstantParametersAstTransformer implements AstTransformer<CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode>): void {

    const defaultReducer = args.root.createReducer();
    const toBeInlined: AstNode[] = [];

    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceParameter: (n, r) => {

        if (toBeInlined.includes(n)) {
          return undefined;
        }

        if (this.getConstantLiteral(n.type.omniType)) {
          toBeInlined.push(n);
          return undefined;
        }

        return defaultReducer.reduceParameter(n, r);
      },

      reduceConstructorParameter: (n, r) => {

        if (toBeInlined.includes(n)) {
          return undefined;
        }

        if (this.getConstantLiteral(n.type.omniType)) {
          toBeInlined.push(n);
          return undefined;
        }

        return defaultReducer.reduceConstructorParameter(n, r);
      },

      reduceDeclarationReference: (n, r) => {

        // Inline value if is literal
        let resolved: Code.VariableDeclaration | Code.Parameter;
        try {
          resolved = n.resolve(args.root);
        } catch (ex) {
          if (ex instanceof ReferenceNodeNotFoundError) {
            logger.warn(`Could not find declaration reference target ${n.targetId}, something is wrong with how declarations are made, but will simply remove and move on`);
            return undefined;
          }
          throw ex;
        }

        if (resolved.type && resolved instanceof Code.Parameter) {

          const literal = this.getConstantLiteral(resolved.type.omniType);
          if (literal) {
            toBeInlined.push(resolved);
            return new Code.Literal(literal[1]);
          } else {

            const def = this.getDefault(resolved.type.omniType);
            if (def !== undefined && OmniUtil.isNullableType(resolved.type.omniType)) {
              return new Code.TernaryExpression(
                new Code.BinaryExpression(n, Code.TokenKind.EQUALS, new Code.Literal(null)),
                new Code.Literal(def),
                n,
              );
            }
          }
        }

        return defaultReducer.reduceDeclarationReference(n, r);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }

  private getConstantLiteral(type: OmniType): [true, any] | undefined {

    const constant = OmniUtil.getSpecifiedConstantValue(type);
    if (constant !== undefined) {
      return [true, constant];
    }

    return undefined;
  }

  private getDefault(type: OmniType): OmniPrimitiveBaseType['value'] {

    if (OmniUtil.isPrimitive(type) && !type.literal && type.value !== undefined) {
      return type.value;
    }

    return undefined;
  }
}
