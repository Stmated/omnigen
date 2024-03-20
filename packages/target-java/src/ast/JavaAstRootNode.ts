import {AstNode, AstNodeWithChildren, Reducer, ReducerResult, RootAstNode, VisitResult} from '@omnigen/core';
import {createJavaVisitor, JavaVisitor} from '../visit';
import {isDefined} from '@omnigen/core-util';
import {DefaultJavaReducer, JavaReducer} from '../reduce';

export class JavaAstRootNode implements RootAstNode, AstNodeWithChildren {

  readonly children: AstNode[] = [];

  createVisitor<R>(): JavaVisitor<R> {
    return createJavaVisitor();
  }

  createReducer(): JavaReducer {
    return DefaultJavaReducer;
  }

  visit<R>(visitor: JavaVisitor<R>): VisitResult<R> {
    return this.children.map(it => it.visit(visitor));
  }

  reduce(reducer: Reducer<JavaVisitor<unknown>>): ReducerResult<JavaAstRootNode> {

    const reduced = this.children.map(it => it.reduce(reducer)).filter(isDefined);
    if (reduced && reduced.length > 0) {
      const newRoot = new JavaAstRootNode();
      newRoot.children.push(...reduced);
      return newRoot;
    }

    return undefined;
  }
}
