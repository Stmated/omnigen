import {AstNode, Reducer, ReducerResult, VisitResult} from '@omnigen/core';
import {CodeVisitor} from '../visitor/CodeVisitor.ts';

class CounterSource {
  private _counter = 0;

  public getNext(): number {
    this._counter++;
    return this._counter;
  }
}

export abstract class AbstractCodeNode implements AstNode {

  private static readonly _COUNTER_SOURCE = new CounterSource();

  private _id?: number;

  get id(): number {
    if (this._id !== undefined) {
      return this._id;
    } else {
      this._id = AbstractCodeNode._COUNTER_SOURCE.getNext();
    }

    return this._id;
  }

  public setId(id: number): this {
    if (this._id !== undefined && this._id !== id) {
      throw new Error(`Not allowed to change id if one has already been set, existing:${this._id}, new:${id}`);
    }
    this._id = id;
    return this;
  }

  hasId(id: number | undefined): boolean {
    if (id === undefined) {
      return false;
    }
    return this._id === id;
  }

  public withIdFrom(node: AstNode): this {

    const copiedId = (node instanceof AbstractCodeNode) ? node._id : node.id;
    if (copiedId !== undefined) {
      return this.setId(copiedId);
    } else {
      return this;
    }
  }

  abstract visit<R>(visitor: CodeVisitor<R>): VisitResult<R>;

  abstract reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<AstNode>;
}
