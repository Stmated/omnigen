import {AstVisitor, VisitFn} from '@omnigen/api';
import * as FreeText from '../ast/FreeText';

export interface AstFreeTextVisitor<R> extends AstVisitor<R> {
  visitFreeText: VisitFn<FreeText.FreeText, R, AstFreeTextVisitor<R>>;
  visitFreeTextParagraph: VisitFn<FreeText.FreeTextParagraph, R, AstFreeTextVisitor<R>>;
  visitFreeTextSection: VisitFn<FreeText.FreeTextSection, R, AstFreeTextVisitor<R>>;
  visitFreeTextLine: VisitFn<FreeText.FreeTextLine, R, AstFreeTextVisitor<R>>;
  visitFreeTextIndent: VisitFn<FreeText.FreeTextIndent, R, AstFreeTextVisitor<R>>;
  visitFreeTextHeader: VisitFn<FreeText.FreeTextHeader, R, AstFreeTextVisitor<R>>;
  visitFreeTextTypeLink: VisitFn<FreeText.FreeTextTypeLink, R, AstFreeTextVisitor<R>>;
  visitFreeTextMemberLink: VisitFn<FreeText.FreeTextMemberLink, R, AstFreeTextVisitor<R>>;
  visitFreeTextPropertyLink: VisitFn<FreeText.FreeTextPropertyLink, R, AstFreeTextVisitor<R>>;
  visitFreeTextList: VisitFn<FreeText.FreeTextList, R, AstFreeTextVisitor<R>>;
  visitFreeTextSee: VisitFn<FreeText.FreeTextSee, R, AstFreeTextVisitor<R>>;
  visitFreeTexts: VisitFn<FreeText.FreeTexts, R, AstFreeTextVisitor<R>>;

  visitFreeTextExample: VisitFn<FreeText.FreeTextExample, R, AstFreeTextVisitor<R>>;
  visitFreeTextCode: VisitFn<FreeText.FreeTextCode, R, AstFreeTextVisitor<R>>;
  visitFreeTextSummary: VisitFn<FreeText.FreeTextSummary, R, AstFreeTextVisitor<R>>;
  visitFreeTextRemark: VisitFn<FreeText.FreeTextRemark, R, AstFreeTextVisitor<R>>;
}

export const createCodeFreeTextVisitor = <R>(partial?: Partial<AstFreeTextVisitor<R>>, n?: R): AstFreeTextVisitor<R> => {

  return {
    visit: (n, v) => n.visit(v),
    visitFreeTexts: (n, v) => n.children.map(it => it.visit(v)),
    visitFreeText: () => n,
    visitFreeTextParagraph: (n, v) => n.child.visit(v),
    visitFreeTextSection: (n, v) => [
      n.header.visit(v),
      n.content.visit(v),
    ],
    visitFreeTextSee: (n, v) => [n.target.visit(v), n.description?.visit(v)],
    visitFreeTextLine: (n, v) => n.child.visit(v),
    visitFreeTextIndent: (n, v) => n.child.visit(v),
    visitFreeTextHeader: (n, v) => n.child.visit(v),
    visitFreeTextTypeLink: (n, v) => n.type.visit(v),
    visitFreeTextMemberLink: (n, v) => [n.type.visit(v), n.member.visit(v)],
    visitFreeTextPropertyLink: (n, v) => n.type.visit(v),
    visitFreeTextList: (n, v) => n.children.map(it => it.visit(v)),
    visitFreeTextExample: (n, v) => n.content.visit(v),
    visitFreeTextCode: (n, v) => n.content.visit(v),
    visitFreeTextSummary: (n, v) => n.content.visit(v),
    visitFreeTextRemark: (n, v) => n.content.visit(v),
    ...partial,
  };
};
