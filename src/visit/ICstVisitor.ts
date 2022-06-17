import {CstRootNode} from '@cst/CstRootNode';
import {ICstNode} from '@cst';

export type VisitResult<R> = void | R | Array<R> | Array<VisitResult<R>>;

export type VisitFn<N extends ICstNode, R, V extends ICstVisitor<R>> = (node: N, visitor: V) => VisitResult<R>;

export interface ICstVisitor<R> {
  visitRootNode: VisitFn<CstRootNode, R, ICstVisitor<R>>;
}
