import {AstNode, OmniType, Reducer, ReducerResult, TypeNode, VisitResult} from '@omnigen/core';
import {TypeScriptVisitor} from '../visit';
import {Code} from '@omnigen/target-code';

export * from '@omnigen/target-code/ast';

export abstract class AbstractTypeScriptNode extends Code.AbstractCodeNode implements AstNode {

  abstract visit<R>(visitor: TypeScriptVisitor<R>): VisitResult<R>;

  abstract reduce(reducer: Reducer<TypeScriptVisitor<unknown>>): ReducerResult<AbstractTypeScriptNode>;
}

export class CompositionType extends AbstractTypeScriptNode implements TypeNode {

  omniType: OmniType;
  typeNodes: AstNode[];

  constructor(omniType: OmniType, typeNodes: AstNode[]) {
    super();
    this.omniType = omniType;
    this.typeNodes = typeNodes;
  }

  visit<R>(visitor: TypeScriptVisitor<R>): VisitResult<R> {
    return visitor.visitCompositionType(this, visitor);
  }

  reduce(reducer: Reducer<TypeScriptVisitor<unknown>>): ReducerResult<CompositionType> {
    return reducer.reduceCompositionType(this, reducer);
  }
}

export class TypeAliasDeclaration extends AbstractTypeScriptNode implements Code.Identifiable, Code.Typed {

  readonly name: Code.Identifier;
  readonly of: TypeNode;
  readonly modifiers?: Code.ModifierList | undefined;

  get omniType() {
    return this.of.omniType;
  }

  constructor(identifier: Code.Identifier, of: TypeNode, modifiers?: Code.ModifierList) {
    super();
    this.name = identifier;
    this.of = of;
    this.modifiers = modifiers;
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
