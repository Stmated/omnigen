import {AstRootNode, AbstractStNode} from '../ast';

export type VisitResult<R> = void | R | Array<R> | Array<VisitResult<R>>;

export type VisitFn<N extends AbstractStNode, R, V extends AstVisitor<R>> = (node: N, visitor: V) => VisitResult<R>;

export interface AstVisitor<R> {
  visitRootNode: VisitFn<AstRootNode, R, AstVisitor<R>>;
}
