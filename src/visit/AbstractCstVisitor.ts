import {CstRootNode} from '@cst/CstRootNode';
import {ICstVisitor, VisitResult} from '@visit';

export abstract class AbstractCstVisitor<R> implements ICstVisitor<R> {
  visitRootNode(node: CstRootNode): VisitResult<R> {
    return node.children.map(it => it.visit(this));
  }
}
