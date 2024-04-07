import {AstVisitor, VisitResult} from '../visit';
import {Reducer, ReducerResult} from '../reduce';
import {AstTargetFunctions} from './AstTargetFunctions.ts';

/**
 * This is an abstract general ST (Syntax Tree) Node.
 *
 * There are then two different tracks of nodes.
 * One for Abstract Syntax Tree Nodes, and one for Concrete Syntax Tree Nodes.
 *
 * The AST Nodes are concepts, like "property" where the nodes are supposed to be language agnostic.
 *
 * The CTS Nodes are concrete, exact (as much as possible) equivalents to the output code.
 *
 * This is useful for situations such as:
 * - General code adding a AstPropertyNode, and not caring how each language will render it.
 * - Specific transformer at a later time converting it into a Java FieldGetterSetter
 *
 * It is then possible to make transformations to the Syntax Tree in two passes, in differing levels of complexity.
 */
export interface AstNode {

  id: number;

  setId(id: number): this;
  withIdFrom(node: AstNode): this;

  visit<R>(visitor: AstVisitor<R>): VisitResult<R>;
  reduce(reducer: Reducer<AstVisitor<unknown>>): ReducerResult<AstNode>;
}

export interface RootAstNode extends AstNode {

  createVisitor<R>(): AstVisitor<R>;
  createReducer(): Reducer<AstVisitor<unknown>>;
  resolveNodeRef<T extends AstNode>(reference: Reference<T>): T;

  /**
   * TODO: Should likely be removed in favor of making type nodes more specific and then adding an AST transformer per target to rewrite them into a suitable form for that target
   */
  getAstUtils(): AstTargetFunctions;
}

export interface Reference<T extends AstNode> extends AstNode {
  targetId: number;

  resolve(root: RootAstNode): T;
}
