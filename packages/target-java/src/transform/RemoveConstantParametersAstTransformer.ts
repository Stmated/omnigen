import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.ts';
import {AstNode, OmniPrimitiveBaseType, OmniType} from '@omnigen/core';
import {OmniUtil} from '@omnigen/core-util';
import {Parameter, TokenKind} from '../ast';
import {Java} from '../index.ts';

/**
 * If a function has the signature `foo(bar: 'baz')` ie. `bar` can only ever take `'baz'`, then we should remove it and fix all callers.
 */
export class RemoveConstantParametersAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const defaultReducer = args.root.createReducer();
    const toBeInlined: AstNode[] = [];
    // TODO: This should also handle the replacement of default-value literals! So that they are properly replace with something like `original ? original : default`
    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceParameter: (n, r) => {

        if (toBeInlined.includes(n)) {
          return undefined;
        }
        // TODO: Figure out why DepositRequest (first class dec) has argument without the literal. Where was it lost?
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
        const resolved = n.resolve(args.root);

        if (resolved.type && resolved instanceof Parameter) {

          const literal = this.getConstantLiteral(resolved.type.omniType);
          if (literal) {
            toBeInlined.push(resolved);
            return new Java.Literal(literal[1]);
          } else {

            const def = this.getDefault(resolved.type.omniType);
            if (def !== undefined) {

              // NOTE: This keeps the original param and ref.
              // In theory if this transformer was ran twice it would exponentially create ternary expressions.
              // So make sure this is only ran once.
              return new Java.TernaryExpression(
                new Java.Predicate(n, TokenKind.EQUALS, new Java.Literal(null)),
                new Java.Literal(def), n,
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
