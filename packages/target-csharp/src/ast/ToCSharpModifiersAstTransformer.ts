import {Code} from '@omnigen/target-code';
import {CSharpUtil} from '../util/CSharpUtil.ts';
import {AstTransformer, OmniTypeKind, TargetOptions, UnknownKind} from '@omnigen/core';
import {CSharpAstTransformerArguments, CSharpRootNode} from './index.ts';
import {CSharpOptions} from '../options';

/**
 * Replace generic modifiers into specific Java modifiers, like `static final` -> `const`
 */
export class ToCSharpModifiersAstTransformer implements AstTransformer<CSharpRootNode, TargetOptions & CSharpOptions> {

  transformAst(args: CSharpAstTransformerArguments): void {

    const base = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...base,
      reduceModifierList: (n, r) => {

        const isStatic = n.children.some(it => it.type === Code.ModifierType.STATIC);
        const isFinal = n.children.some(it => it.type === Code.ModifierType.FINAL);

        if (isStatic && isFinal) {

          const altered = [...n.children].filter(it => it.type !== Code.ModifierType.CONST && it.type !== Code.ModifierType.STATIC && it.type !== Code.ModifierType.FINAL);

          altered.push(new Code.Modifier(Code.ModifierType.CONST));

          return new Code.ModifierList(...altered).withIdFrom(n);
        }

        return n;
      },

      reduceSuperConstructorCall: (n, r) => {

        let alteredArgumentCount = 0;
        const newArguments = new Code.ArgumentList();
        for (let i = 0; i < n.arguments.children.length; i++) {
          const argument = n.arguments.children[i];
          let resolvedArgument = argument;
          let needsCast = false;
          if (resolvedArgument instanceof Code.DeclarationReference) {
            resolvedArgument = resolvedArgument.resolve(args.root);
          }
          if (resolvedArgument instanceof Code.Parameter) {
            const t = resolvedArgument.type.omniType;
            needsCast = (t.kind === OmniTypeKind.UNKNOWN && (t.unknownKind ?? args.options.unknownType) === UnknownKind.ANY);
          }

          if (needsCast) {

            // C# does not allow `dynamic` to be used in the constructor base call. So need to do a cast.
            // NOTE: This might require deletion later, if decide to move away from `dynamic`
            alteredArgumentCount++;
            const castedArgument = new Code.Cast(
              args.root.getAstUtils().createTypeNode({kind: OmniTypeKind.OBJECT, properties: [], name: ''}),
              argument,
            );

            newArguments.children.push(castedArgument);

          } else {
            newArguments.children.push(argument);
          }
        }

        if (alteredArgumentCount > 0) {
          return new Code.SuperConstructorCall(newArguments).withIdFrom(n);
        }

        return base.reduceSuperConstructorCall(n, r);
      },

      reduceIdentifier: (n, r) => {

        if (args.root.getNameResolver().isReservedWord(n.value)) {
          return new Code.Identifier(`@${n.value}`, n.original ?? n.value);
        }

        return base.reduceIdentifier(n, r);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
