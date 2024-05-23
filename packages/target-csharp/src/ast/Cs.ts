import {CSharpVisitor} from '../visit';
import {AstNode, OmniProperty, Reducer, ReducerResult, Reference, RootAstNode, TypeNode, VisitResult} from '@omnigen/core';
import {Code} from '@omnigen/target-code';

export * from '@omnigen/target-code/ast';

export abstract class AbstractCSharpNode extends Code.AbstractCodeNode implements AstNode {

  abstract visit<R>(visitor: CSharpVisitor<R>): VisitResult<R>;

  abstract reduce(reducer: Reducer<CSharpVisitor<unknown>>): ReducerResult<AbstractCSharpNode>;
}

export class PropertyIdentifier extends AbstractCSharpNode {

  identifier: Code.Identifier;

  constructor(identifier: Code.Identifier) {
    super();
    this.identifier = identifier;
  }

  visit<R>(visitor: CSharpVisitor<R>): VisitResult<R> {
    return visitor.visitPropertyIdentifier(this, visitor);
  }

  reduce(reducer: Reducer<CSharpVisitor<unknown>>): ReducerResult<PropertyIdentifier> {
    return reducer.reducePropertyIdentifier(this, reducer);
  }
}

/**
 * TODO: Should be moved to be more general, and then languages like Java and TypeScript can replace it with more specific "getter" and "setter" nodes
 */
export class PropertyNode extends AbstractCSharpNode {

  readonly type: TypeNode;
  readonly identifier: PropertyIdentifier;
  property?: OmniProperty | undefined;
  modifiers?: Code.ModifierList | undefined;
  getModifiers?: Code.ModifierList | undefined;
  setModifiers?: Code.ModifierList | undefined;
  // getBody?: AstNode | undefined;
  // setBody?: AstNode | undefined;
  initializer?: AstNode | undefined;
  comments?: Code.Comment | undefined;
  immutable?: boolean | undefined;

  constructor(typeNode: TypeNode, identifier: PropertyIdentifier) {
    super();
    this.type = typeNode;
    this.identifier = identifier;
  }

  visit<R>(visitor: CSharpVisitor<R>): VisitResult<R> {
    return visitor.visitProperty(this, visitor);
  }

  reduce(reducer: Reducer<CSharpVisitor<unknown>>): ReducerResult<PropertyNode> {
    return reducer.reduceProperty(this, reducer);
  }
}

export class PropertyReference extends AbstractCSharpNode implements Reference<PropertyNode> {
  targetId: number;

  constructor(target: number | PropertyNode) {
    super();
    this.targetId = (typeof target === 'number') ? target : target.id;
  }

  public resolve(root: RootAstNode): PropertyNode {
    return root.resolveNodeRef(this);
  }

  visit<R>(visitor: CSharpVisitor<R>): VisitResult<R> {
    return visitor.visitPropertyReference(this, visitor);
  }

  reduce(reducer: Reducer<CSharpVisitor<unknown>>): ReducerResult<PropertyReference> {
    return reducer.reducePropertyReference(this, reducer);
  }
}
