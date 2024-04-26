import {AstNode, AstNodeWithChildren, AstTargetFunctions, NodeResolveCtx, Reducer, ReducerResult, Reference, RootAstNode, VisitResult} from '@omnigen/core';
import {createJavaVisitor, JavaVisitor} from '../visit';
import {isDefined, ReferenceNodeNotFoundError} from '@omnigen/core-util';
import {DefaultJavaReducer, JavaReducer} from '../reduce';
import {AbstractJavaNode} from './JavaAstTypes.ts';
import {JavaAstUtils} from '../transform';

export class JavaAstRootNode extends AbstractJavaNode implements RootAstNode, AstNodeWithChildren {

  private static _astUtils: JavaAstUtils | undefined;

  readonly children: AstNode[] = [];

  /**
   * This is read-only and will be wiped away after each tree folding/reduction.
   * Since the idea is that all nodes are immutable, this will be a valid cache until next rebuilding.
   */
  private _referenceIdNodeMap?: ReadonlyMap<number, AstNode> | undefined;

  createVisitor<R>(): JavaVisitor<R> {
    return createJavaVisitor();
  }

  createReducer(): JavaReducer {
    return DefaultJavaReducer;
  }

  getAstUtils(): AstTargetFunctions {
    if (!JavaAstRootNode._astUtils) {
      JavaAstRootNode._astUtils = new JavaAstUtils();
    }

    return JavaAstRootNode._astUtils;
  }

  public resolveNodeRef<T extends AstNode>(reference: Reference<T>): T {
    if (this._referenceIdNodeMap === undefined) {
      this._referenceIdNodeMap = JavaAstUtils.getReferenceIdNodeMap(this, this.createIdVisitor);
    }

    const targetId = reference.targetId;
    const result = this._referenceIdNodeMap.get(targetId);
    if (!result) {
      throw new ReferenceNodeNotFoundError(targetId);
    }

    // The cast might be wrong, but it is probably fine most of the time, and makes the caller code simpler.
    return result as T;
  }

  createIdVisitor(ctx: NodeResolveCtx<void, JavaVisitor<void>>): Partial<JavaVisitor<void>> {
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
      visitArrayType: () => {
      },
      visitWildcardType: () => {
      },
      visitGenericType: () => {
      },
      visitEdgeType: () => {
      },
    };
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
