import {ICstVisitor} from '@visit/ICstVisitor';

export interface IVisitorFactory<R, V extends ICstVisitor<R>> {
  create(): V;
}
