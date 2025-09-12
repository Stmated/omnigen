import {AstNode, OmniCompositionType, OmniType, Reducer, ReducerResult, TypeNode, VisitResult} from '@omnigen/api';
import {TypeScriptVisitor} from '../visit';
import {Code} from '@omnigen/target-code';
import {GetterIdentifier, SetterIdentifier} from '@omnigen/target-code/ast';

export * from '@omnigen/target-code/ast';

export abstract class AbstractTypeScriptNode extends Code.AbstractCodeNode implements AstNode {

  abstract visit<R>(visitor: TypeScriptVisitor<R>): VisitResult<R>;

  abstract reduce(reducer: Reducer<TypeScriptVisitor<unknown>>): ReducerResult<AbstractTypeScriptNode>;
}

export class CompositionType extends AbstractTypeScriptNode implements TypeNode {

  omniType: OmniCompositionType;
  typeNodes: AstNode[];

  constructor(omniType: OmniCompositionType, typeNodes: AstNode[]) {
    super();
    this.omniType = omniType;
    this.typeNodes = typeNodes;
  }

  visit<R>(visitor: TypeScriptVisitor<R>): VisitResult<R> {
    return visitor.visitCompositionType(this, visitor);
  }

  reduce(reducer: Reducer<TypeScriptVisitor<unknown>>): ReducerResult<TypeNode> {
    return reducer.reduceCompositionType(this, reducer);
  }
}

export class TypeAliasDeclaration extends AbstractTypeScriptNode implements Code.Identifiable, Code.Typed {

  readonly name: Code.Identifier;
  readonly of: TypeNode;
  readonly modifiers?: Code.ModifierList | undefined;
  readonly comments?: Code.Comment | undefined;

  get omniType() {
    return this.of.omniType;
  }

  constructor(identifier: Code.Identifier, of: TypeNode, modifiers?: Code.ModifierList, comments?: Code.Comment) {
    super();
    this.name = identifier;
    this.of = of;
    this.modifiers = modifiers;
    this.comments = comments;
  }

  visit<R>(visitor: TypeScriptVisitor<R>): VisitResult<R> {

    // TODO: Figure out why this is okay -- make it a compilation error -- should not be able to call something which does not exist!
    // TODO: Is the solution to replace AstVisitor visitor arg with `this` and then needing to keep a STRICT grip on what visitor is used and sent along?

    return visitor.visitTypeAliasDeclaration(this, visitor);
  }

  reduce(reducer: Reducer<TypeScriptVisitor<unknown>>): ReducerResult<TypeAliasDeclaration> {
    return reducer.reduceTypeAliasDeclaration(this, reducer);
  }
}

/**
 * TODO: This should replace the other FieldBackedGetter -- since this is more general
 */
export class Getter extends AbstractTypeScriptNode {

  readonly identifier: GetterIdentifier;
  readonly target: AstNode | undefined;
  readonly returnType: TypeNode;
  readonly modifiers: Code.ModifierList;
  readonly comments: Code.Comment | undefined;

  constructor(identifier: GetterIdentifier, target: AstNode | undefined, returnType: TypeNode, comments: Code.Comment | undefined, modifiers: Code.ModifierList) {
    super();
    this.identifier = identifier;
    this.target = target;
    this.returnType = returnType;
    this.comments = comments;
    this.modifiers = modifiers;
  }

  visit<R>(visitor: TypeScriptVisitor<R>): VisitResult<R> {
    return visitor.visitGetter(this, visitor);
  }

  reduce(reducer: Reducer<TypeScriptVisitor<unknown>>): ReducerResult<AstNode> {
    return reducer.reduceGetter(this, reducer);
  }
}

/**
 * TODO: This should replace the other FieldBackedSetter -- since this is more general
 */
export class Setter extends AbstractTypeScriptNode {

  readonly identifier: SetterIdentifier;
  readonly target: AstNode;
  readonly targetType: TypeNode;
  readonly modifiers: Code.ModifierList;

  constructor(identifier: SetterIdentifier, targetType: TypeNode, target: AstNode, modifiers: Code.ModifierList) {
    super();
    this.identifier = identifier;
    this.targetType = targetType;
    this.target = target;
    this.modifiers = modifiers;
  }

  visit<R>(visitor: TypeScriptVisitor<R>): VisitResult<R> {
    return visitor.visitSetter(this, visitor);
  }

  reduce(reducer: Reducer<TypeScriptVisitor<unknown>>): ReducerResult<AstNode> {
    return reducer.reduceSetter(this, reducer);
  }
}
