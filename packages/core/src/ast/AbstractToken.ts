import {IAstVisitor, VisitResult} from '../visit';

export abstract class AbstractToken {
  abstract visit<R>(visitor: IAstVisitor<R>): VisitResult<R>;
}
