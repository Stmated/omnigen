import {ICstVisitor, VisitResult} from '@visit';

export interface ICstNode {
  visit<R>(visitor: ICstVisitor<R>): VisitResult<R>;
}
