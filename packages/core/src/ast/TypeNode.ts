import {OmniType} from '../parse';
import {Reducer, ReducerResult} from '../reduce';
import {AstVisitor} from '../visit';
import {AstNode} from './AstNode.ts';

export interface TypeNode<T extends OmniType = OmniType> extends AstNode {
  omniType: T;
  implementation?: boolean | undefined;

  reduce(reducer: Reducer<AstVisitor<unknown>>): ReducerResult<TypeNode>;
}
