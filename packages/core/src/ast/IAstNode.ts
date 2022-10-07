import {IAstVisitor, VisitResult} from '../visit';

export interface IAstNode {
  visit<R>(visitor: IAstVisitor<R>): VisitResult<R>;
}
