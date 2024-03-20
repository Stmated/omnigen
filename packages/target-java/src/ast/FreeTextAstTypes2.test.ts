import {it, expect} from 'vitest';
import {AnyFreeText2, freeTextDelegator, FreeTextNodeKind2, toStringVisitor} from './FreeTextAstTypes2.ts';

it('test', () => {

  const text1: AnyFreeText2 = {kind: FreeTextNodeKind2.FREETEXT, text: 'Hello'};
  const text2: AnyFreeText2 = {kind: FreeTextNodeKind2.FREETEXT, text: ', '};
  const text3: AnyFreeText2 = {kind: FreeTextNodeKind2.FREETEXT, text: 'World'};
  const texts: AnyFreeText2 = {kind: FreeTextNodeKind2.FREETEXTS, children: [text1, text2, text3]};

  expect(toStringVisitor.visitFreeText(text1, toStringVisitor)).toBe('Hello');
  expect(toStringVisitor.visitFreeText(text2, toStringVisitor)).toBe(', ');
  expect(toStringVisitor.visitFreeText(text3, toStringVisitor)).toBe('World');
  expect(toStringVisitor.visitFreeTexts(texts, toStringVisitor)).toBe('Hello+, +World');
  expect(freeTextDelegator(texts, toStringVisitor)).toBe('Hello+, +World');
});
