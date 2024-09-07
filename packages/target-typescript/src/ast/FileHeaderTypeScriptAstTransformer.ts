import {AstTransformer, AstTransformerArguments, TargetOptions} from '@omnigen/api';
import {Ts} from '../ast';
import {TypeScriptAstReducer} from './TypeScriptAstReducer.ts';
import {Code, FreeTextUtils} from '@omnigen/target-code';
import {TypeScriptOptions} from '../options';
import {FreeTextLine} from '@omnigen/target-code/ast';

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
      reduceCompilationUnit: n => {

        n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, new FreeTextLine(`noinspection JSUnusedGlobalSymbols`)), n.comments?.kind ?? Code.CommentKind.SINGLE);
        return n;
      },
    };

    const newRoot = args.root.reduce(reducer);
    if (newRoot) {
      args.root = newRoot;
    }
  }
}
