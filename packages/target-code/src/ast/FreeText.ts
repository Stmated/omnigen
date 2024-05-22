import {AstNode, AstNodeWithChildren, OmniProperty, Reducer, ReducerResult, VisitResult} from '@omnigen/core';
import {AstFreeTextVisitor} from '../visitor/FreeTextVisitor';
import {FreeTextUtils} from '../util/FreeTextUtils';
import {AbstractCodeNode} from './AbstractCodeNode.ts';

export abstract class AbstractFreeText extends AbstractCodeNode {

}

export class FreeText extends AbstractFreeText {
  readonly text: string;

  constructor(text: string) {
    super();
    this.text = text;
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeText(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeText(this, reducer);
  }
}

export class FreeTexts extends AbstractFreeText implements AstNodeWithChildren<AnyFreeText> {
  readonly children: Array<AnyFreeText>;

  constructor(...children: FriendlyFreeTextIn[]) {
    super();
    this.children = children.map(it => FreeTextUtils.fromFriendlyFreeText(it));
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTexts(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTexts(this, reducer);
  }
}

export type FriendlyFreeTextIn = AnyFreeText | string | Array<FriendlyFreeTextIn>;

export class FreeTextLine extends AbstractFreeText {
  readonly child: AnyFreeText;

  constructor(text: FriendlyFreeTextIn) {
    super();
    this.child = FreeTextUtils.fromFriendlyFreeText(text);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextLine(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<FreeTextLine> {
    return reducer.reduceFreeTextLine(this, reducer);
  }
}

export class FreeTextIndent extends AbstractFreeText {
  readonly child: AnyFreeText;

  constructor(text: FriendlyFreeTextIn) {
    super();
    this.child = FreeTextUtils.fromFriendlyFreeText(text);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextIndent(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<FreeTextIndent> {
    return reducer.reduceFreeTextIndent(this, reducer);
  }
}

export class FreeTextParagraph extends AbstractFreeText {
  readonly child: AnyFreeText;

  constructor(text: FriendlyFreeTextIn) {
    super();
    this.child = FreeTextUtils.fromFriendlyFreeText(text);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextParagraph(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<FreeTextParagraph> {
    return reducer.reduceFreeTextParagraph(this, reducer);
  }
}

export class FreeTextList extends AbstractFreeText {
  readonly children: AnyFreeText[];
  readonly ordered: boolean;

  constructor(children: FriendlyFreeTextIn[], ordered?: boolean) {
    super();
    this.children = children.map(it => FreeTextUtils.fromFriendlyFreeText(it));
    this.ordered = ordered ?? false;
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextList(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<FreeTextList> {
    return reducer.reduceFreeTextList(this, reducer);
  }
}

export class FreeTextHeader extends AbstractFreeText {
  readonly level: number;
  readonly child: AnyFreeText;

  constructor(level: number, text: FriendlyFreeTextIn) {
    super();
    this.level = level;
    this.child = FreeTextUtils.fromFriendlyFreeText(text);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextHeader(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextHeader(this, reducer);
  }
}

export class FreeTextSection extends AbstractFreeText {
  readonly header: FreeTextHeader;
  readonly content: AnyFreeText;

  constructor(header: FreeTextHeader, content: FriendlyFreeTextIn) {
    super();
    this.header = header;
    this.content = FreeTextUtils.fromFriendlyFreeText(content);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextSection(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextSection(this, reducer);
  }
}

export class FreeTextExample extends AbstractFreeText {
  readonly content: AnyFreeText;

  constructor(content: FriendlyFreeTextIn) {
    super();
    this.content = FreeTextUtils.fromFriendlyFreeText(content);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextExample(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextExample(this, reducer);
  }
}

export class FreeTextCode extends AbstractFreeText {
  readonly content: AnyFreeText;

  constructor(content: FriendlyFreeTextIn) {
    super();
    this.content = FreeTextUtils.fromFriendlyFreeText(content);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextCode(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextCode(this, reducer);
  }
}

export class FreeTextSummary extends AbstractFreeText {
  readonly content: AnyFreeText;

  constructor(content: FriendlyFreeTextIn) {
    super();
    this.content = FreeTextUtils.fromFriendlyFreeText(content);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextSummary(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextSummary(this, reducer);
  }
}

export class FreeTextRemark extends AbstractFreeText {
  readonly content: AnyFreeText;

  constructor(content: FriendlyFreeTextIn) {
    super();
    this.content = FreeTextUtils.fromFriendlyFreeText(content);
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextRemark(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextRemark(this, reducer);
  }
}

export class FreeTextTypeLink extends AbstractFreeText {
  readonly type: AstNode;

  constructor(type: AstNode) {
    super();
    this.type = type;
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextTypeLink(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextTypeLink(this, reducer);
  }
}

export class FreeTextMemberLink extends AbstractFreeText {
  readonly type: AstNode;
  readonly member: AstNode;

  constructor(type: AstNode, member: AstNode) {
    super();
    this.type = type;
    this.member = member;
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextMemberLink(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextMemberLink(this, reducer);
  }
}

export class FreeTextSee extends AbstractFreeText {
  readonly target: AnyFreeText;
  readonly description?: AnyFreeText | undefined;

  constructor(target: FriendlyFreeTextIn, description?: FriendlyFreeTextIn | undefined) {
    super();
    this.target = FreeTextUtils.fromFriendlyFreeText(target);
    this.description = description ? FreeTextUtils.fromFriendlyFreeText(description) : undefined;
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextSee(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextSee(this, reducer);
  }
}

/**
 * TODO: Remove in favor of the more general "MemberLink"
 */
export class FreeTextPropertyLink extends AbstractFreeText {
  readonly type: AstNode;
  readonly property: OmniProperty;

  constructor(type: AstNode, property: OmniProperty) {
    super();
    this.type = type;
    this.property = property;
  }

  visit<R>(visitor: AstFreeTextVisitor<R>): VisitResult<R> {
    return visitor.visitFreeTextPropertyLink(this, visitor);
  }

  reduce(reducer: Reducer<AstFreeTextVisitor<unknown>>): ReducerResult<AnyFreeText> {
    return reducer.reduceFreeTextPropertyLink(this, reducer);
  }
}

export type AnyFreeText =
  | FreeText
  | FreeTextParagraph
  | FreeTextLine
  | FreeTextIndent
  | FreeTextHeader
  | FreeTextSection
  | FreeTextList
  | FreeTextPropertyLink
  | FreeTextMemberLink
  | FreeTextTypeLink
  | FreeTexts
  | FreeTextExample
  | FreeTextCode
  | FreeTextSummary
  | FreeTextRemark
  | FreeTextSee;
