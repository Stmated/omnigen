import {IAstVisitor} from '@omnigen/core';

export interface IVisitorFactory<R, V extends IAstVisitor<R>> {
  create(): V;
}
