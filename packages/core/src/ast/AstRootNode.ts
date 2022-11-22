import {AbstractStNode} from '../ast/index.js';
import {AstVisitor, VisitResult} from '../visit/index.js';

export class AstRootNode extends AbstractStNode {
  children: AbstractStNode[] = [];

  visit<R>(visitor: AstVisitor<R>): VisitResult<R> {
    return visitor.visitRootNode(this, visitor);
  }
}
