import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from '../transform';
import * as Java from '../ast';
import {VisitorFactoryManager} from '@omnigen/core-util';

export class AddGeneratedCommentAstTransformer extends AbstractJavaAstTransformer {

  transformAst(args: JavaAstTransformerArgs): void {

    if (!args.options.includeGenerated) {
      return;
    }

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitObjectDeclaration: node => {

        const dateString = new Date().toISOString();
        const commentString = `Generate by Omnigen @ ${dateString}`;

        if (!node.comments) {
          node.comments = new Java.CommentBlock(new Java.FreeText(commentString));
        } else {

          const previousCommnent = node.comments.text;
          node.comments = new Java.CommentBlock(new Java.FreeTexts(new Java.FreeTextLine(previousCommnent), new Java.FreeText(commentString)));
        }
      },
    }));
  }
}
