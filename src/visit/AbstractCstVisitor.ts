import {CstRootNode} from '@cst/CstRootNode';
import {ICstVisitor, VisitFn} from '@visit';

// export abstract class AbstractCstVisitor<R> implements ICstVisitor<R> {
//
//   visitRootNode: VisitFn<CstRootNode, R, this>;
//
//   constructor() {
//     this.visitRootNode = (visitor, node) => node.children.map(it => it.visit(this));
//   }
// }
