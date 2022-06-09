import {CstRootNode} from '@cst/CstRootNode';

export interface ICstVisitor {
  visitRootNode(node: CstRootNode<this>): void;
}
