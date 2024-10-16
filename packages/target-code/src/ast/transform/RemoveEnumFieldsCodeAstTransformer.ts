import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments} from '@omnigen/api';
import * as Code from '../CodeAst';
import {CodeRootAstNode} from '../CodeRootAstNode';

const logger = LoggerFactory.create(import.meta.url);

/**
 * Will remove any child inside an enum that is not an enum list.
 */
export class RemoveEnumFieldsCodeAstTransformer implements AstTransformer<CodeRootAstNode> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode>): void {

    const newRoot = args.root.reduce({
      ...args.root.createReducer(),
      reduceEnumDeclaration: n => {

        n.body.children = n.body.children.filter(it => it instanceof Code.EnumItemList);
        if (n.body.children.length == 0) {
          return undefined;
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
