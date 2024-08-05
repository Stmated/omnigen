import {AstNode, VisitFn} from '@omnigen/api';
import {Cs} from '../ast';
import {createCodeVisitor, CodeVisitor} from '@omnigen/target-code';

export type CSharpVisitFn<N extends AstNode, R> = VisitFn<N, R, CSharpVisitor<R>>;

export interface CSharpVisitor<R> extends CodeVisitor<R> {

  visitProperty: CSharpVisitFn<Cs.PropertyNode, R>;
  visitPropertyIdentifier: CSharpVisitFn<Cs.PropertyIdentifier, R>;
  visitPropertyReference: CSharpVisitFn<Cs.PropertyReference, R>;
}

export const createCSharpVisitor = <R>(partial?: Partial<CSharpVisitor<R>>, java?: Partial<CodeVisitor<R>>, noop?: R | undefined): Readonly<CSharpVisitor<R>> => {

  return {
    ...createCodeVisitor(java, noop),

    visitProperty: (n, v) => [
      n.comments?.visit(v),
      n.annotations?.visit(v),
      n.modifiers?.visit(v),
      n.type.visit(v),
      n.identifier.visit(v),
      n.getModifiers?.visit(v),
      n.setModifiers?.visit(v),
      n.initializer?.visit(v),
    ],
    visitPropertyIdentifier: (n, v) => n.identifier.visit(v),
    visitPropertyReference: () => noop,

    ...partial,
  };
};

export const DefaultCSharpVisitor = createCSharpVisitor();
