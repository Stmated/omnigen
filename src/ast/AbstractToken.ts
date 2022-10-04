import {IAstVisitor, VisitResult} from '@visit';

export default abstract class AbstractToken {
  abstract visit<R>(visitor: IAstVisitor<R>): VisitResult<R>;
}
