import {AstRootNode, AbstractStNode} from '../ast';

export type VisitResult<R> = void | R | Array<R> | Array<VisitResult<R>>;

export type VisitFn<N extends AbstractStNode, R, V extends AstVisitor<R>> = (node: N, visitor: V) => VisitResult<R>;

export interface AstVisitor<R> {
  visitRootNode: VisitFn<AstRootNode, R, AstVisitor<R>>;
}

export class AbortVisitingWithResult<T> extends Error {

  private readonly _result: T;

  get result(): T {
    return this._result;
  }

  constructor(result: T) {
    super();
    this._result = result;

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, AbortVisitingWithResult.prototype);
  }
}
