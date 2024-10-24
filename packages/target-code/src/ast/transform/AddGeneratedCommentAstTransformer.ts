import {Visitor} from '@omnigen/core';
import {AstTransformer, AstTransformerArguments, TargetOptions} from '@omnigen/api';
import {CodeRootAstNode} from '../CodeRootAstNode';
import * as Code from '../CodeAst';
import {CodeOptions} from '../../options/CodeOptions';
import {FreeTextUtils} from '../../util/FreeTextUtils';
import {FreeTextLine, FreeTextRemark} from '../FreeText';

export class AddGeneratedCommentAstTransformer implements AstTransformer<CodeRootAstNode, TargetOptions & CodeOptions> {

  transformAst(args: AstTransformerArguments<CodeRootAstNode, TargetOptions & CodeOptions>): void {

    if (!args.options.includeGenerated) {
      return;
    }

    const defaultVisitor = args.root.createVisitor();
    const unitHasCommentStack: boolean[] = [];

    args.root.visit(Visitor.create(defaultVisitor, {

      visitCompilationUnit: (n, v) => {

        if (args.options.includeGeneratedInFileHeader) {

          const dateString = new Date().toISOString();
          const commentString = `Generated by Omnigen @ ${dateString}`;

          n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, new FreeTextLine(commentString)), n.comments?.kind ?? Code.CommentKind.SINGLE);

          return n;

        } else {
          try {
            unitHasCommentStack.push(false);
            return defaultVisitor.visitCompilationUnit(n, v);
          } finally {
            unitHasCommentStack.pop();
          }
        }
      },

      visitObjectDeclaration: node => {

        if (unitHasCommentStack[unitHasCommentStack.length - 1]) {
          return;
        }

        unitHasCommentStack[unitHasCommentStack.length - 1] = true;

        const dateString = new Date().toISOString();
        const commentString = `Generated by Omnigen @ ${dateString}`;

        node.comments = new Code.Comment(FreeTextUtils.add(node.comments?.text, new FreeTextRemark(commentString)), node.comments?.kind);
      },
    }));
  }
}
