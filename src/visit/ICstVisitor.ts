import {CstRootNode} from '@cst/CstRootNode';

export type VisitResult<R> = void | R | Array<R> | Array<VisitResult<R>>;

export interface ICstVisitor<R> {
  visitRootNode(node: CstRootNode): VisitResult<R>;
}
