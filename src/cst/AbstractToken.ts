import {ICstVisitor, VisitResult} from '@visit';

export default abstract class AbstractToken {
  abstract visit<R>(visitor: ICstVisitor<R>): VisitResult<R>;
}
