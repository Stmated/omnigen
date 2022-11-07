import {AbstractStNode} from '../ast';
import {AstVisitor, VisitResult} from '../visit';

export class AstRootNode extends AbstractStNode {
  children: AbstractStNode[] = [];

  visit<R>(visitor: AstVisitor<R>): VisitResult<R> {
    return visitor.visitRootNode(this, visitor);
  }
}
