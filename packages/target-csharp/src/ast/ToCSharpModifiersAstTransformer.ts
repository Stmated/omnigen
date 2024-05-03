import {AbstractJavaAstTransformer, Java, JavaAstTransformerArgs} from '@omnigen/target-java';
import {CSharpUtil} from '../util/CSharpUtil.ts';
import {OmniTypeKind, UnknownKind} from '@omnigen/core';

/**
 * Replace generic modifiers into specific Java modifiers, like `static final` -> `const`
 */
export class ToCSharpModifiersAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    const base = args.root.createReducer();
    const newRoot = args.root.reduce({
      ...base,
      reduceModifierList: (n, r) => {

        const isStatic = n.children.some(it => it.type === Java.ModifierType.STATIC);
        const isFinal = n.children.some(it => it.type === Java.ModifierType.FINAL);

        if (isStatic && isFinal) {

          const altered = [...n.children].filter(it => it.type !== Java.ModifierType.CONST && it.type !== Java.ModifierType.STATIC && it.type !== Java.ModifierType.FINAL);

          altered.push(new Java.Modifier(Java.ModifierType.CONST));

          return new Java.ModifierList(...altered).withIdFrom(n);
        }

        return n;
      },

      reduceSuperConstructorCall: (n, r) => {

        let alteredArgumentCount = 0;
        const newArguments = new Java.ArgumentList();
        for (let i = 0; i < n.arguments.children.length; i++) {
          const argument = n.arguments.children[i];
          let resolvedArgument = argument;
          let needsCast = false;
          if (resolvedArgument instanceof Java.DeclarationReference) {
            resolvedArgument = resolvedArgument.resolve(args.root);
          }
          if (resolvedArgument instanceof Java.Parameter) {
            const t = resolvedArgument.type.omniType;
            needsCast = (t.kind === OmniTypeKind.UNKNOWN && (t.unknownKind ?? args.options.unknownType) === UnknownKind.ANY);
          }

          if (needsCast) {

            // C# does not allow `dynamic` to be used in the constructor base call. So need to do a cast.
            // NOTE: This might require deletion later, if decide to move away from `dynamic`
            alteredArgumentCount++;
            const castedArgument = new Java.Cast(
              args.root.getAstUtils().createTypeNode({kind: OmniTypeKind.OBJECT, properties: [], name: ''}),
              argument,
            );

            newArguments.children.push(castedArgument);

          } else {
            newArguments.children.push(argument);
          }
        }

        if (alteredArgumentCount > 0) {
          return new Java.SuperConstructorCall(newArguments).withIdFrom(n);
        }

        return base.reduceSuperConstructorCall(n, r);
      },

      reduceIdentifier: (n, r) => {

        if (CSharpUtil.isReservedWord(n.value)) {
          return new Java.Identifier(`@${n.value}`, n.original ?? n.value);
        }

        return base.reduceIdentifier(n, r);
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
