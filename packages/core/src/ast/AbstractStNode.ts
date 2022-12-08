import {AstVisitor, VisitResult} from '../visit/index.js';

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
export abstract class AbstractStNode {
  abstract visit<R>(visitor: AstVisitor<R>): VisitResult<R>;
}

export interface StNodeWithChildren<T extends AbstractStNode> {

  children: T[];
}

// export interface AstNode<C extends AbstractStNode> extends AbstractStNode {
//
//   toConcrete<P extends AbstractStNode>(parent: P): C;
// }
