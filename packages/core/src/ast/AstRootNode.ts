import {AbstractNode} from '../ast';
import {AstVisitor, VisitResult} from '../visit';

export class AstRootNode extends AbstractNode {
  children: AbstractNode[] = [];

  visit<R>(visitor: AstVisitor<R>): VisitResult<R> {
    return visitor.visitRootNode(this, visitor);
  }
}
