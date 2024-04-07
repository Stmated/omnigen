import {AstNode, AstNodeWithChildren, AstTargetFunctions, ReducerResult, RootAstNode, VisitResult} from '@omnigen/core';
import {createTypeScriptVisitor, TypeScriptVisitor} from '../visit';
import {isDefined} from '@omnigen/core-util';
import {DefaultTypeScriptAstReducer, TypeScriptAstReducer} from './TypeScriptAstReducer.ts';
import {Java} from '@omnigen/target-java';
import {TsAstUtils} from './TsAstUtils.ts';

export class TsRootNode extends Java.JavaAstRootNode implements RootAstNode, AstNodeWithChildren {

  private static readonly _TS_AST_UTILS = new TsAstUtils();

  constructor(children: AstNode[]) {
    super();
    this.children.push(...children);
  }

  createVisitor<R>(): TypeScriptVisitor<R> {
    return createTypeScriptVisitor();
  }

  createReducer(): TypeScriptAstReducer {
    return DefaultTypeScriptAstReducer;
  }

  getAstUtils(): AstTargetFunctions {
    return TsRootNode._TS_AST_UTILS;
  }

  visit<R>(visitor: TypeScriptVisitor<R>): VisitResult<R> {
    return this.children.map(it => it.visit(visitor));
  }

  reduce(reducer: TypeScriptAstReducer): ReducerResult<TsRootNode> {

    const reduced = this.children.map(it => it.reduce(reducer)).filter(isDefined);
    if (reduced && reduced.length > 0) {
      return new TsRootNode(reduced).withIdFrom(this);
    }

    return undefined;
  }
}
