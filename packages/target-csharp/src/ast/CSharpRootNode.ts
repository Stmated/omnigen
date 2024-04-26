import {AstNode, AstNodeWithChildren, AstTargetFunctions, NodeResolveCtx, ReducerResult, RootAstNode, VisitResult} from '@omnigen/core';
import {createCSharpVisitor, CSharpVisitor} from '../visit';
import {isDefined} from '@omnigen/core-util';
import {Java} from '@omnigen/target-java';
import {CSharpAstReducer, DefaultCSharpAstReducer} from './CSharpAstReducer.ts';
import {CsAstUtils} from './CsAstUtils.ts';

export class CSharpRootNode extends Java.JavaAstRootNode implements RootAstNode, AstNodeWithChildren {

  private static readonly _TS_AST_UTILS = new CsAstUtils();

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
