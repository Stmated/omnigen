import {AstNode, AstNodeWithChildren, Reducer, ReducerResult, VisitResult} from '@omnigen/core';
import {JavaVisitor} from '../visit';
import {isDefined} from '@omnigen/core-util';

export class JavaAstRootNode implements AstNode, AstNodeWithChildren {

  readonly children: AstNode[] = [];

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return this.children.map(it => it.visit(visitor));
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<JavaAstRootNode> {

    const reduced = this.children.map(it => it.reduce(reducer)).filter(isDefined);
    if (reduced && reduced.length > 0) {
      const root = new JavaAstRootNode();
      root.children.push(...reduced);
    }

    return undefined;
  }
}
