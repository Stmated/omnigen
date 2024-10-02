import {AstNode, AstNodeWithChildren, AstTargetFunctions, NodeResolveCtx, ObjectNameResolver, ReducerResult, RootAstNode, TargetFunctions, VisitResult} from '@omnigen/api';
import {createCSharpVisitor, CSharpVisitor} from '../visit';
import {isDefined} from '@omnigen/core';
import {Code} from '@omnigen/target-code';
import {CSharpAstReducer, DefaultCSharpAstReducer} from './CSharpAstReducer';
import {CsAstUtils} from './CsAstUtils';
import {CSharpObjectNameResolver} from './CSharpObjectNameResolver';
import {CSharpModelFunctions} from '../parse';

export class CSharpRootNode extends Code.CodeRootAstNode implements RootAstNode, AstNodeWithChildren {

  private static readonly _TS_AST_UTILS = new CsAstUtils();
  private static readonly _TS_NAME_RESOLVER = new CSharpObjectNameResolver();
  private static readonly _TS_MODEL_FUNCTIONS = new CSharpModelFunctions();

  constructor(children: AstNode[]) {
    super();
    this.children.push(...children);
  }

  createVisitor<R>(): CSharpVisitor<R> {
    return createCSharpVisitor();
  }

  createReducer(): CSharpAstReducer {
    return DefaultCSharpAstReducer;
  }

  getAstUtils(): AstTargetFunctions {
    return CSharpRootNode._TS_AST_UTILS;
  }

  getNameResolver(): ObjectNameResolver {
    return CSharpRootNode._TS_NAME_RESOLVER;
  }

  getFunctions(): TargetFunctions {
    return CSharpRootNode._TS_MODEL_FUNCTIONS;
  }

  visit<R>(visitor: CSharpVisitor<R>): VisitResult<R> {
    return this.children.map(it => it.visit(visitor));
  }

  reduce(reducer: CSharpAstReducer): ReducerResult<CSharpRootNode> {

    const reduced = this.children.map(it => it.reduce(reducer)).filter(isDefined);
    if (reduced && reduced.length > 0) {
      return new CSharpRootNode(reduced).withIdFrom(this);
    }

    return undefined;
  }

  createIdVisitor(ctx: NodeResolveCtx<void, CSharpVisitor<void>>): Partial<CSharpVisitor<void>> {
    return {
      ...super.createIdVisitor(ctx),
      visitPropertyReference: (n, v) => {
        ctx.ids.push(n.targetId);
      },
      visitProperty: (n, v) => {
        ctx.map.set(n.id, n);
        ctx.visitor.visitProperty(n, v);
      },
      visitDelegate: (n, v) => {
        ctx.map.set(n.id, n);
        ctx.visitor.visitDelegate(n, v);
      },
    };
  }
}
