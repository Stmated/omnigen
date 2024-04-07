import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/core';
import {Java} from '@omnigen/target-java';
import {TsRootNode} from './TsRootNode.ts';
import {TypeScriptOptions} from '../options';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Perhaps rewrite this into a "FewerFiles" transformer, that keep "top" types as separate files
 */
export class SingleFileTypeScriptAstTransformer implements AstTransformer<TsRootNode> {

  transformAst(args: AstTransformerArguments<TsRootNode, PackageOptions & TargetOptions & TypeScriptOptions>): void {

    if (!args.options.singleFile) {
      return;
    }

    const defaultReducer = args.root.createReducer();

    let firstUnit: Java.CompilationUnit | undefined = undefined;

    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceCompilationUnit: (n, r) => {

        if (firstUnit === undefined) {

          firstUnit = n;
          return n;
        } else {

          firstUnit.children.push(...n.children);
          firstUnit.imports.children.length = 0;
          return undefined;
        }
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
