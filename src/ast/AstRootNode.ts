import AbstractNode from './AbstractNode';
import {IAstVisitor, VisitResult} from '@visit';

export class AstRootNode extends AbstractNode {
  children: AbstractNode[] = [];

  visit<R>(visitor: IAstVisitor<R>): VisitResult<R> {
    return visitor.visitRootNode(this, visitor);
  }
}
