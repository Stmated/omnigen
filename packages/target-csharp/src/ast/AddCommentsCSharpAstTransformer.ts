import {LoggerFactory} from '@omnigen/core-log';
import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/api';
import {AddCommentsAstTransformer, Code, FreeTextUtils} from '@omnigen/target-code';
import {CSharpRootNode} from '../ast';
import {CSharpOptions} from '../options';

const logger = LoggerFactory.create(import.meta.url);

export class AddCommentsCSharpAstTransformer implements AstTransformer<CSharpRootNode> {

  transformAst(args: AstTransformerArguments<CSharpRootNode, PackageOptions & TargetOptions & CSharpOptions>): void {

    if (!args.options.commentsOnGetters) {
      return;
    }

    const defaultReducer = args.root.createReducer();

    const newRoot = args.root.reduce({
      ...defaultReducer,
      reduceProperty: n => {

        if (n.property) {
          const commentsText = AddCommentsAstTransformer.getCommentsList(args.root, n.property, args.model, args.options);
          if (commentsText) {
            n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, commentsText), n.comments?.kind);
          }
        }

        const ownerCommentsText = AddCommentsAstTransformer.getOwnerComments(n.property?.type ?? n.type.omniType, args, false);
        if (ownerCommentsText) {
          n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, ownerCommentsText), n.comments?.kind);
        }

        return n;
      },
    });

    if (newRoot) {
      args.root = newRoot;
    }
  }
}
