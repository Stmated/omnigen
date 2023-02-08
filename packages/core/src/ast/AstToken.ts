import {AstVisitor, VisitResult} from '../visit';

export interface AstToken {
  visit<R>(visitor: AstVisitor<R>): VisitResult<R>;
}
