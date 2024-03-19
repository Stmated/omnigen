import {AstNode, OmniCompositionType, Reducer, ReducerResult, VisitResult} from '@omnigen/core';
import {TypeScriptVisitor} from '../visit';
import {Java} from '@omnigen/target-java';

export abstract class AbstractTypeScriptNode implements AstNode {

  abstract visit<R>(visitor: TypeScriptVisitor<R>): VisitResult<R>;

  abstract reduce(reducer: Reducer<TypeScriptVisitor<unknown>>): ReducerResult<AbstractTypeScriptNode>;
}

export class CompositionType<T extends OmniCompositionType = OmniCompositionType> extends AbstractTypeScriptNode implements Java.TypeNode<T> {

  omniType: T;
  typeNodes: Java.TypeNode[];

  constructor(omniType: T, typeNodes: Java.TypeNode[]) {
    super();
    this.omniType = omniType;
    this.typeNodes = typeNodes;
  }

  getImportName(): string | undefined {
    throw new Error(`Cannot get the import name of a composition type node`);
  }

  getLocalName(): string | undefined {
    throw new Error(`Cannot get the local name of a composition type node`);
  }

  visit<R>(visitor: TypeScriptVisitor<R>): VisitResult<R> {
    return visitor.visitCompositionType(this, visitor);
  }

  reduce(reducer: Reducer<TypeScriptVisitor<unknown>>): ReducerResult<CompositionType> {
    return reducer.reduceCompositionType(this, reducer);
  }
}

export class TypeAliasDeclaration extends AbstractTypeScriptNode implements Java.Identifiable {

  readonly name: Java.Identifier;
  readonly of: Java.TypeNode;

  constructor(identifier: Java.Identifier, of: Java.TypeNode) {
    super();
    this.name = identifier;
    this.of = of;
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
