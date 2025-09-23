import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/api';
import {TypeScriptOptions} from '../options';
import {Ts} from '../ast';
import {Code, CodeAstUtils} from '@omnigen/target-code';

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

      reduceMethodDeclaration: n => {

        if (!n.body && n.signature.identifier instanceof Code.GetterIdentifier) {

          // TODO: Only do this if we're inside an interface. Perhaps this should be in an interface-specific ast transformer
          return new Ts.Getter(n.signature.identifier, undefined, n.signature.type, n.signature.comments, n.signature.modifiers);
        }

        const soloReturn = CodeAstUtils.getSoloReturnOfNoArgsMethod(n);
        if (soloReturn) {
          let identifier: Ts.GetterIdentifier | undefined = undefined;
          if (n.signature.identifier instanceof Ts.GetterIdentifier) {
            identifier = n.signature.identifier;
          }

          if (identifier) {
            return new Ts.Getter(identifier, soloReturn, n.signature.type, n.signature.comments, n.signature.modifiers);
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
