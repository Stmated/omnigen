import {AstTransformer, AstTransformerArguments, PackageOptions, TargetOptions} from '@omnigen/api';
import {CommentResolver, OmniUtil, PropertyComment, Visitor} from '@omnigen/core';
import * as Code from '../Code';
import * as FreeText from '../FreeText';
import {CodeOptions, IncludeExampleCommentsMode, PropertyTypeCommentMode} from '../../options/CodeOptions';
import {FreeTextUtils} from '../../util/FreeTextUtils';
import {CodeAstUtils} from '../CodeAstUtils';

export class AddCommentsAstTransformer implements AstTransformer<Code.CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions> {

  transformAst(args: AstTransformerArguments<Code.CodeRootAstNode, PackageOptions & TargetOptions & CodeOptions>): void {

    const resolver = new CommentResolver(args.features);
    const baseVisitor = args.root.createVisitor();
    args.root.visit(Visitor.create(baseVisitor, {

      visitObjectDeclaration: (n, v) => {

        if (args.options.commentsOnTypes) {

          const comment = resolver.getTypeDeclarationComment(args.model, n.type.omniType);

          OmniUtil.forEach(comment.description, v => {
            n.comments = new Code.Comment(FreeTextUtils.addCommentSummary(n.comments?.text, v), n.comments?.kind);
          });

          if (args.options.responseUseComments && comment.responseComments?.length) {

            OmniUtil.forEach(comment.responseComments, v => {
              const text = v.summary ?? v.description;
              if (text) {
                OmniUtil.forEach(text, v => {
                  n.comments = new Code.Comment(FreeTextUtils.addCommentSummary(n.comments?.text, v), n.comments?.kind);

                  // n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, new FreeText.FreeTextParagraph(v)), n.comments?.kind);
                });
              }
            });
          }

          if (comment.children) {
            for (const child of comment.children) {
              if (child.description) {
                if (child.title) {
                  const definition = new FreeText.FreeTextDefinition(child.title, child.description);
                  n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, definition), n.comments?.kind);
                } else {
                  n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, child.description), n.comments?.kind);
                }
              }
            }
          }

          if (args.options.includeExampleCommentsMode === IncludeExampleCommentsMode.ALWAYS && comment.exampleGroups) {
            for (const group of comment.exampleGroups) {

              const exampleText = new FreeText.FreeTextSection(
                new FreeText.FreeTextHeader(2, group.title ?? 'Examples'),
                new FreeText.FreeTextList(
                  // TODO: Add support for having a description/summary for the example
                  group.examples.map(it => {

                    const text = (typeof it.value === 'object') ? JSON.stringify(it.value, undefined, 2) : JSON.stringify(it.value);
                    return new FreeText.FreeTextExample(text);
                  }),
                ),
              );

              n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, exampleText), n.comments?.kind);
            }
          }
        }

        if (n.comments) {
          n.comments = new Code.Comment(FreeTextUtils.simplifyComment(n.comments.text), n.comments?.kind);
        }

        baseVisitor.visitObjectDeclaration(n, v);
      },

      visitField: n => {

        // Add comment if enabled on fields or on getters/accessors.
        // It is up to any transformer which adds the accessors for the field to remove the comment from the field if it should not stay there.
        let comment: PropertyComment | undefined = undefined;

        if (args.options.commentsOnFields) {

          comment = resolver.getPropertyComment(args.model, n.type.omniType, n.property);

          OmniUtil.forEach(comment.description, v => {
            n.comments = new Code.Comment(
              FreeTextUtils.add(n.comments?.text, new FreeText.FreeTextParagraph(v)), n.comments?.kind,
            );
          });

          if (comment.deprecated) {
            // TODO: Create a new freetext for "deprecated" -- this is too Java-centric
            n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, new FreeText.FreeTextDeprecated()), n.comments?.kind);
          }

          if (comment.typeComment) {
            if (comment.typeComment.description) {
              n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, comment.typeComment.description), n.comments?.kind);
            }
          }
        }

        if (args.options.defaultValueCommentsOnFields) {

          if (!comment) {
            comment = resolver.getPropertyComment(args.model, n.type.omniType, n.property);
          }

          if (comment.defaultValues) {
            const freeTextDefaults = comment.defaultValues.map(v => new FreeText.FreeTextDefault(v));
            n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, freeTextDefaults), n.comments?.kind);
          }
        }

        if (args.options.debug) {
          if (n.type.omniType.debug) {
            const paragraph = new Code.FreeTexts(...OmniUtil.debugToStrings(n.type.omniType.debug, v => new Code.FreeTextLine(v)));
            n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, paragraph), n.comments?.kind);
          }

          if (n.property?.debug) {
            const paragraph = new Code.FreeTexts(...OmniUtil.debugToStrings(n.property.debug, v => new Code.FreeTextLine(v)));
            n.comments = new Code.Comment(FreeTextUtils.add(n.comments?.text, paragraph), n.comments?.kind);
          }
        }

        if (args.options.typeCommentsOnProperties === PropertyTypeCommentMode.ALWAYS) {

        }
      },

      visitMethodDeclaration: n => {

        if (args.options.commentsOnGetters) {

          const type = n.signature.type.omniType;
          const returnNode = CodeAstUtils.getSoloReturnOfNoArgsMethod(n);
          if (returnNode) {

            const comment = resolver.getMethodDeclarationComment(
              args.model,
              type,
              (n.signature.parameters?.children ?? []).map(it => ({name: it.identifier.value, type: it.type.omniType})),
            );

            OmniUtil.forEach(comment.summary, v => {
              n.signature.comments = new Code.Comment(
                FreeTextUtils.add(n.signature.comments?.text, new FreeText.FreeTextParagraph(v)), n.signature.comments?.kind,
              );
            });

            OmniUtil.forEach(comment.description, v => {
              n.signature.comments = new Code.Comment(
                FreeTextUtils.add(n.signature.comments?.text, new FreeText.FreeTextParagraph(v)), n.signature.comments?.kind,
              );
            });

            if (args.options.includeExampleCommentsMode === IncludeExampleCommentsMode.ALWAYS && comment.exampleGroups) {
              for (const group of comment.exampleGroups) {

                const exampleText = new FreeText.FreeTextSection(
                  new FreeText.FreeTextHeader(2, group.title ?? 'Examples'),
                  new FreeText.FreeTextList(
                    // TODO: Add support for having a description/summary for the example
                    group.examples.map(it => new FreeText.FreeTextExample(JSON.stringify(it.value))),
                  ),
                );

                n.signature.comments = new Code.Comment(FreeTextUtils.add(n.signature.comments?.text, exampleText), n.signature.comments?.kind);
              }
            }
          }

          if (n.signature.comments) {
            n.signature.comments = new Code.Comment(FreeTextUtils.simplifyComment(n.signature.comments.text), n.signature.comments?.kind);
          }
        }
      },

      visitConstructor: n => {
      },
    }));
  }
}
