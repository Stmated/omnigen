import {AstNode} from '../ast';

export type VisitResult<R> = void | R | Array<R> | Array<VisitResult<R>>;

export type VisitFn<N extends AstNode, R, V extends AstVisitor<R>> = (n: N, v: V) => VisitResult<R>;

export interface AstVisitor<R> {

  visit: VisitFn<AstNode, R, AstVisitor<R>>;
}
