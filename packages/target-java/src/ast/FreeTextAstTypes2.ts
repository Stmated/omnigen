import {TypeNode} from './JavaAstTypes.ts';
import {assertUnreachable} from '@omnigen/core-util';

export enum FreeTextNodeKind2 {
  FREETEXT = 'FREETEXT',
  FREETEXTS = 'FREETEXTS',
  // FREETEXT_HEADER = 'FREETEXT_HEADER',
  // FREETEXT_INDENT = 'FREETEXT_INDENT',
  // FREETEXT_LINE = 'FREETEXT_LINE',
  // FREETEXT_LIST = 'FREETEXT_LIST',
  // FREETEXT_PARAGRAPH = 'FREETEXT_PARAGRAPH',
  // FREETEXT_SECTION = 'FREETEXT_SECTION',
  // FREETEXT_TYPE_LINK = 'FREETEXT_TYPE_LINK',
  // FREETEXT_PROPERTY_LINK = 'FREETEXT_PROPERTY_LINK',
  // FREETEXT_METHOD_LINK = 'FREETEXT_METHOD_LINK',
}

type FriendlyFreeTextIn = AnyFreeText2 | string | Array<FriendlyFreeTextIn>;

const fromFriendlyFreeText = (text: FriendlyFreeTextIn): AnyFreeText2 => {
  if (typeof text == 'string') {
    return {kind: FreeTextNodeKind2.FREETEXT, text: text};
  } else {
    if (Array.isArray(text)) {
      return {kind: FreeTextNodeKind2.FREETEXTS, children: text.map(it => fromFriendlyFreeText(it))};
    } else {
      return text;
    }
  }
};

// interface BaseFreeTextNode<K extends FreeTextNodeKind> extends AstNode2<K> {
//
// }

// interface FreeTextLine extends AstNode2<FreeTextNodeKind.FREETEXT_LINE> {
//   readonly child: AnyFreeText;
// }

// interface FreeTextIndent extends BaseFreeTextNode<FreeTextNodeKind.FREETEXT_INDENT> {
//   readonly child: AnyFreeText;
// }
//
// interface FreeTextParagraph extends BaseFreeTextNode<FreeTextNodeKind.FREETEXT_PARAGRAPH> {
//   readonly child: AnyFreeText;
// }

// interface FreeTextList extends AstNode2<FreeTextNodeKind.FREETEXT_LIST> {
//   readonly children: ReadonlyArray<AnyFreeText>;
//   readonly ordered: boolean;
// }
//
// interface FreeTextHeader extends AstNode2<FreeTextNodeKind.FREETEXT_HEADER> {
//   readonly level: number;
//   readonly child: AnyFreeText;
// }

// interface FreeTextSection extends BaseFreeTextNode<FreeTextNodeKind.FREETEXT_SECTION> {
//   readonly header: FreeTextHeader;
//   readonly content: AnyFreeText;
// }

// interface FreeTextTypeLink extends AstNode2<FreeTextNodeKind.FREETEXT_TYPE_LINK> {
//   readonly type: TypeNode;
// }

// interface FreeTextMethodLink extends BaseFreeTextNode<FreeTextNodeKind.FREETEXT_METHOD_LINK> {
//   readonly type: TypeNode;
//   readonly method: AstNode;
// }
//
// interface FreeTextPropertyLink extends BaseFreeTextNode<FreeTextNodeKind.FREETEXT_PROPERTY_LINK> {
//   readonly type: TypeNode;
//   readonly property: OmniProperty;
// }

// export type AnyFreeText =
//   FreeText
//   // | FreeTextLine
//   // | FreeTextHeader
//   // | FreeTextList
//   // | FreeTextTypeLink
//   | FreeTexts;


export interface AstNode2<K> {
  readonly kind: K;
}

export interface FreeText2 extends AstNode2<FreeTextNodeKind2.FREETEXT> {
  readonly text: string;
}

export interface FreeTexts2 extends AstNode2<FreeTextNodeKind2.FREETEXTS> {
  readonly children: ReadonlyArray<AnyFreeText2>;
}

export type AnyFreeText2 =
  FreeText2
  | FreeTexts2;

export type FreeTextVisitor2<K, R> = (node: Extract<AnyFreeText2, {kind: K}>, visitor: FreeTextVisitors2<R>) => R;

export type FreeTextVisitors2<R> = {
  visitFreeText: FreeTextVisitor2<FreeTextNodeKind2.FREETEXT, R>;
  visitFreeTexts: FreeTextVisitor2<FreeTextNodeKind2.FREETEXTS, R>;
};

export const freeTextDelegator = <R>(node: AnyFreeText2, visitor: FreeTextVisitors2<R>): R => {
  switch (node.kind) {
    case FreeTextNodeKind2.FREETEXT:
      return visitor.visitFreeText(node, visitor);
    case FreeTextNodeKind2.FREETEXTS:
      return visitor.visitFreeTexts(node, visitor);
  }

  assertUnreachable(node);
};

export const toStringVisitor: FreeTextVisitors2<string> = {
  visitFreeText: (node, visitor) => node.text,
  visitFreeTexts: (node, visitor) => node.children.map(it => {
    return freeTextDelegator(it, visitor);
  }).join('+'),
};

