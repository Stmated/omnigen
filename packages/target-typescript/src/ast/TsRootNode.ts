import {AstNode, AstNodeWithChildren, ReducerResult, RootAstNode, VisitResult} from '@omnigen/core';
import {createTypeScriptVisitor, TypeScriptVisitor} from '../visit';
import {isDefined} from '@omnigen/core-util';
import {DefaultTypeScriptAstReducer, TypeScriptAstReducer} from './TypeScriptAstReducer.ts';
import {Java} from '@omnigen/target-java';

export class TsRootNode extends Java.JavaAstRootNode implements RootAstNode, AstNodeWithChildren {
  // children: AstNode[];

  constructor(children: AstNode[]) {
    super();
    // this.children = children;
    this.children.push(...children);
  }

  createVisitor<R>(): TypeScriptVisitor<R> {
    return createTypeScriptVisitor();
  }

  createReducer(): TypeScriptAstReducer {
    return DefaultTypeScriptAstReducer;
  }

  visit<R>(visitor: TypeScriptVisitor<R>): VisitResult<R> {
    return this.children.map(it => it.visit(visitor));
  }

  reduce(reducer: TypeScriptAstReducer): ReducerResult<TsRootNode> {

    const reduced = this.children.map(it => it.reduce(reducer)).filter(isDefined);
    if (reduced && reduced.length > 0) {
      return new TsRootNode(reduced);
    }

    return undefined;
  }
}
