import AbstractNode from './AbstractNode';
import {ICstVisitor, VisitResult} from '@visit';

export class CstRootNode extends AbstractNode {
  children: AbstractNode[] = [];

  visit<R>(visitor: ICstVisitor<R>): VisitResult<R> {
    return visitor.visitRootNode(this);
  }
}
