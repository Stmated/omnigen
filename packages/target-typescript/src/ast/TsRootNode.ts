import {AstNode, AstNodeWithChildren, Reducer, ReducerResult, VisitResult} from '@omnigen/core';
import {TypeScriptVisitor} from '../visit';
import {isDefined} from '@omnigen/core-util';

export class TsRootNode implements AstNode, AstNodeWithChildren {
  children: AstNode[];

  constructor(children: AstNode[]) {
    this.children = children;
  }

  visit<R>(visitor: TypeScriptVisitor<R>): VisitResult<R> {
    return this.children.map(it => it.visit(visitor));
  }

  reduce(reducer: Reducer<TypeScriptVisitor<unknown>>): ReducerResult<TsRootNode> {

    const reduced = this.children.map(it => it.reduce(reducer)).filter(isDefined);
    if (reduced && reduced.length > 0) {
      return new TsRootNode(reduced);
    }

    return undefined;
  }
}
