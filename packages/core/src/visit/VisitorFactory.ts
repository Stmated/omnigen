import {AstVisitor} from '@omnigen/core';

export interface VisitorFactory<R, V extends AstVisitor<R>> {
  create(): V;
}
