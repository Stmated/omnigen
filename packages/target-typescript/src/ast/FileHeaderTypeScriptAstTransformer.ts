import {AstTransformer, AstTransformerArguments, TargetOptions} from '@omnigen/api';
import {Ts} from '../ast';
import {TypeScriptAstReducer} from './TypeScriptAstReducer.ts';
import {Code} from '@omnigen/target-code';
import {TypeScriptOptions} from '../options';

export class FileHeaderTypeScriptAstTransformer implements AstTransformer<Ts.TsRootNode, TargetOptions & TypeScriptOptions> {

  transformAst(args: AstTransformerArguments<Ts.TsRootNode, TargetOptions & TypeScriptOptions>): void {

    if (!args.options.relaxedInspection) {

      // If inspection is strict, then we will not add any code linting ignores.
      // Things like unused declarations and such will become warnings for most people.
      return;
    }

    const defaultReducer = args.root.createReducer();
    const reducer: TypeScriptAstReducer = {
      ...defaultReducer,
      reduceCompilationUnit: (n, r) => {

        const reduced = defaultReducer.reduceCompilationUnit(n, r);
        if (reduced) {
          reduced.children.splice(
            0, 0,
            new Code.Comment(`noinspection JSUnusedGlobalSymbols`, Code.CommentKind.SINGLE),
            new Code.FormatNewline(),
          );
        }

        return reduced;
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }
}
