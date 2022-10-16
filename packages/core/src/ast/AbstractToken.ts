import {AstVisitor, VisitResult} from '../visit';

export abstract class AbstractToken {
  abstract visit<R>(visitor: AstVisitor<R>): VisitResult<R>;
}
