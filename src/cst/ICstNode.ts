import {ICstVisitor} from '../visit/ICstVisitor';

export interface ICstNode<TVisitor extends ICstVisitor> {
  visit(visitor: TVisitor): void;
}
