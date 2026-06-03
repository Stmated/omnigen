import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/api';
import {Code, FreeTextUtils, IncludeExampleCommentsMode} from '@omnigen/target-code';
import {CSharpRootNode} from '../ast';
import {CSharpOptions} from '../options';
import {CommentResolver, OmniUtil} from '@omnigen/core';
import * as FreeText from '@omnigen/target-code/ast';

export class AddCommentsCSharpAstTransformer implements AstTransformer<CSharpRootNode> {

  transformAst(args: AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions & CSharpOptions>): void {

    if (!args.options.commentsOnGetters) {
      return;
    }

    const resolver = new CommentResolver(args.features);
    const defaultReducer = args.root.createReducer();

    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceProperty: n => {

        const comment = resolver.getPropertyComment(args.model, n.type.omniType, n.property);
        if (comment.description) {
          OmniUtil.forEach(comment.description, v => {
            n.comments = new Code.Comment(FreeTextUtils.addCommentSummary(n.comments?.text, v), n.comments?.kind);
          });
        }

        if (comment.typeComment?.description) {
          OmniUtil.forEach(comment.typeComment?.description, v => {
            n.comments = new Code.Comment(FreeTextUtils.addCommentSummary(n.comments?.text, v), n.comments?.kind);
          });
        }

        if (args.options.includeExampleCommentsMode === IncludeExampleCommentsMode.ALWAYS && comment.typeComment?.exampleGroups) {
          for (const group of comment.typeComment?.exampleGroups) {

            // const exampleText = new FreeText.FreeTextSection(
            //   new FreeText.FreeTextHeader(2, group.title ?? 'Examples'),
            //   new FreeText.FreeTextList(
            //     // TODO: Add support for having a description/summary for the example
            //     group.examples.map(it => {
            //       const text = (typeof it.value === 'object') ? JSON.stringify(it.value, undefined, 2) : JSON.stringify(it.value);
            //       return new FreeText.FreeTextExample(text);
            //     }),
            //   ),
            // );

            //   new FreeText.FreeTextList(
            //   // TODO: Add support for having a description/summary for the example
            //
            // );

            const exampleText = group.examples.map(it => {
              const text = (typeof it.value === 'object') ? JSON.stringify(it.value, undefined, 2) : JSON.stringify(it.value);
              return new FreeText.FreeTextExample(text);
            });

            n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, exampleText), n.comments?.kind);
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
