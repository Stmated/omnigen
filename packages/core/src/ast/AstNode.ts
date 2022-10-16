import {AstVisitor, VisitResult} from '../visit';

export interface AstNode {
  visit<R>(visitor: AstVisitor<R>): VisitResult<R>;
}
