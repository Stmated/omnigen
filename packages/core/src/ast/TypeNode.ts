import {OmniType} from '../parse';
import {Reducer, ReducerResult} from '../reduce';
import {AstVisitor} from '../visit';
import {AstNode} from './AstNode';

export interface TypeNode<T extends OmniType = OmniType> extends AstNode {
  readonly omniType: T;
  readonly implementation?: boolean | undefined;

  reduce(reducer: Reducer<AstVisitor<unknown>>): ReducerResult<TypeNode>;
}
