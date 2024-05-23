import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
// import {Code} from '@omnigen/target-code';
// import {TsRootNode} from './TsRootNode.ts';
import {TypeScriptOptions} from '../options';
import {Ts} from '../ast';
import {CodeAstUtils} from '@omnigen/target-code';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Will replace getter- and setter-like nodes into specific Getter and Setter nodes.
 *
 * NOTE: `FieldBackedGetter` and `FieldBackedSetter` should probably be replaced in `target-code` with these more general `Getter` and `Setter` nodes.
 */
export class AccessorTypeScriptAstTransformer implements AstTransformer<Ts.TsRootNode> {

  transformAst(args: AstTransformerArguments<Ts.TsRootNode, PackageOptions & TargetOptions & TypeScriptOptions>): void {

    const defaultReducer = args.root.createReducer();

    const newRoot = args.root.reduce({
      ...defaultReducer,
      // reduceFieldBackedGetter: n => {
      //   const field = n.fieldRef.resolve(args.root);
      //   return new Ts.Getter(
      //     new Ts.GetterIdentifier(field.identifier, field.type),
      //     n.fieldRef,
      //   );
      // },
      // reduceFieldBackedSetter: n => {
      //   const field = n.fieldRef.resolve(args.root);
      //   return new Ts.Setter(
      //     new Ts.SetterIdentifier(field.identifier, field.type),
      //     field.type,
      //     n.fieldRef,
      //   );
      // },

      reduceMethodDeclaration: (n, r) => {

        const soloReturn = CodeAstUtils.getSoloReturnOfNoArgsMethod(n);
        if (soloReturn) {
          let identifier: Ts.GetterIdentifier | undefined = undefined;
          if (n.signature.identifier instanceof Ts.GetterIdentifier) {
            identifier = n.signature.identifier;
          }

          if (identifier) {
            return new Ts.Getter(identifier, soloReturn, n.signature.type, n.signature.modifiers);
          }
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
