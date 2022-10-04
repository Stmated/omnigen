import {IAstVisitor} from '@visit/IAstVisitor';

export interface IVisitorFactory<R, V extends IAstVisitor<R>> {
  create(): V;
}
