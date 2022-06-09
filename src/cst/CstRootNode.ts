import AbstractNode from './AbstractNode';
import {ICstVisitor} from '../visit/ICstVisitor';

export class CstRootNode<TVisitor extends ICstVisitor> extends AbstractNode<TVisitor> {
  children: AbstractNode<TVisitor>[] = [];

  visit(visitor: TVisitor): void {
    visitor.visitRootNode(this);
  }
}
