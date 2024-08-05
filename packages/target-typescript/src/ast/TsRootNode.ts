import {AstNode, AstNodeWithChildren, AstTargetFunctions, ObjectNameResolver, ReducerResult, RootAstNode, TargetFunctions, VisitResult} from '@omnigen/api';
import {createTypeScriptVisitor, TypeScriptVisitor} from '../visit';
import {isDefined} from '@omnigen/core';
import {DefaultTypeScriptAstReducer, TypeScriptAstReducer} from './TypeScriptAstReducer.ts';
import {TsAstUtils} from './TsAstUtils.ts';
import {Code} from '@omnigen/target-code';
import {TypeScriptObjectNameResolver} from './TypeScriptObjectNameResolver.ts';
import {TsModelFunctions} from '../parse/TsModelFunctions.ts';

export class TsRootNode extends Code.CodeRootAstNode implements RootAstNode, AstNodeWithChildren {

  private static readonly _TS_AST_UTILS = new TsAstUtils();
  private static readonly _TS_NAME_RESOLVER = new TypeScriptObjectNameResolver();
  private static readonly _TS_MODEL_FUNCTIONS = new TsModelFunctions();

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
    return TsRootNode._TS_AST_UTILS; // TsRootNode._TS_AST_UTILS;
  }

  getFunctions(): TargetFunctions {
    return TsRootNode._TS_MODEL_FUNCTIONS;
  }

  getNameResolver(): ObjectNameResolver {
    return TsRootNode._TS_NAME_RESOLVER;
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
