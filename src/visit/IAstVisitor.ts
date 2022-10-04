import {IAstNode, AstRootNode} from '@ast';

export type VisitResult<R> = void | R | Array<R> | Array<VisitResult<R>>;

export type VisitFn<N extends IAstNode, R, V extends IAstVisitor<R>> = (node: N, visitor: V) => VisitResult<R>;

export interface IAstVisitor<R> {
  visitRootNode: VisitFn<AstRootNode, R, IAstVisitor<R>>;
}
