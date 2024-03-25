import {AstNode, AstNodeWithChildren, Reducer, ReducerResult, RootAstNode, VisitResult} from '@omnigen/core';
import {createJavaVisitor, JavaVisitor} from '../visit';
import {isDefined} from '@omnigen/core-util';
import {DefaultJavaReducer, JavaReducer} from '../reduce';
import {AbstractJavaNode} from './JavaAstTypes.ts';
import {JavaAstUtils} from '../transform';

export class JavaAstRootNode extends AbstractJavaNode implements RootAstNode, AstNodeWithChildren {

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

  public getNodeWithId<T extends AstNode>(id: number): T {

    if (this._referenceIdNodeMap === undefined) {
      this._referenceIdNodeMap = JavaAstUtils.getReferenceIdNodeMap(this);
    }

    const result = this._referenceIdNodeMap.get(id);
    if (!result) {
      throw new Error(`Queried for node with id ${id}, but it could not be found. Some transformation made the node tree out-of-sync.`);
    }

    // The cast might be wrong, but it is probably fine most of the time, and makes the caller code simpler.
    return result as T;
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
