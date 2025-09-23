import {AstNode, AstNodeWithChildren, AstTargetFunctions, NodeResolveCtx, ObjectNameResolver, Reducer, ReducerResult, Reference, RootAstNode, TargetFunctions, VisitResult} from '@omnigen/api';
import {ReferenceNodeNotFoundError} from '@omnigen/core';
import {CodeAstUtils} from './CodeAstUtils';
import {CodeVisitor, createCodeVisitor} from '../visitor/CodeVisitor';
import {CodeReducer, DefaultCodeReducer} from '../reduce/CodeAstReducer';
import {AbstractCodeNode} from './AbstractCodeNode';

export abstract class CodeRootAstNode extends AbstractCodeNode implements RootAstNode, AstNodeWithChildren {

  private static _astUtils: CodeAstUtils | undefined;

  readonly children: AstNode[] = [];

  /**
   * This is read-only and will be wiped away after each tree folding/reduction.
   * Since the idea is that all nodes are immutable, this will be a valid cache until next rebuilding.
   */
  private _referenceIdNodeMap?: ReadonlyMap<number, AstNode> | undefined;

  createVisitor<R>(): CodeVisitor<R> {
    return createCodeVisitor();
  }

  createReducer(): CodeReducer {
    return DefaultCodeReducer;
  }

  getAstUtils(): AstTargetFunctions {
    if (!CodeRootAstNode._astUtils) {
      CodeRootAstNode._astUtils = new CodeAstUtils();
    }

    return CodeRootAstNode._astUtils;
  }

  abstract getFunctions(): TargetFunctions;

  abstract getNameResolver(): ObjectNameResolver;

  public resolveNodeRef<T extends AstNode>(reference: Reference<T>): T {
    if (this._referenceIdNodeMap === undefined) {
      this._referenceIdNodeMap = CodeAstUtils.getReferenceIdNodeMap(this, this.createIdVisitor);
    }

    const targetId = reference.targetId;
    const result = this._referenceIdNodeMap.get(targetId);
    if (!result) {
      throw new ReferenceNodeNotFoundError(targetId);
    }

    // The cast might be wrong, but it is probably fine most of the time, and makes the caller code simpler.
    return result as T;
  }

  createIdVisitor(ctx: NodeResolveCtx<void, CodeVisitor<void>>): Partial<CodeVisitor<void>> {
    return {
      visitFieldReference: (n, v) => {
        ctx.ids.push(n.targetId);
      },
      visitDeclarationReference: (n, v) => {
        ctx.ids.push(n.targetId);
      },
      visitField: (n, v) => {
        ctx.map.set(n.id, n);
      },
      visitParameter: (n, v) => {
        ctx.map.set(n.id, n);
        ctx.visitor.visitParameter(n, v);
      },
      visitVariableDeclaration: (n, v) => {
        ctx.map.set(n.id, n);
        ctx.visitor.visitVariableDeclaration(n, v);
      },
      visitConstructorParameter: (n, v) => {
        ctx.map.set(n.id, n);
        ctx.visitor.visitConstructorParameter(n, v);
      },
      visitDelegate: (n, v) => {
        ctx.map.set(n.id, n);
        ctx.visitor.visitDelegate(n, v);
      },
      visitGenericRef: (n, v) => {
        ctx.ids.push(n.targetId);
      },
      // Remove as many visits as possible to make the visiting faster.
      visitInterfaceDeclaration: () => {
      },
      visitImportList: () => {
      },
      visitExtendsDeclaration: () => {
      },
      visitImplementsDeclaration: () => {
      },
      visitTypeList: () => {
      },
      visitArrayInitializer: () => {
      },
      visitBoundedType: () => {
      },
      // visitArrayType: () => {
      // },
      visitWildcardType: () => {
      },
      visitGenericType: () => {
      },
      visitEdgeType: () => {
      },
    };
  }

  visit<R>(visitor: CodeVisitor<R>): VisitResult<R> {
    return this.children.map(it => it.visit(visitor));
  }

  abstract reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<CodeRootAstNode>
}
