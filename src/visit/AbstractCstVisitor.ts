import {CstRootNode} from '@cst/CstRootNode';
import {ICstVisitor} from '@visit';

export abstract class AbstractCstVisitor implements ICstVisitor {
  visitRootNode(node: CstRootNode<this>): void {
    for (const child of node.children) {
      child.visit(this);
    }
  }
}
