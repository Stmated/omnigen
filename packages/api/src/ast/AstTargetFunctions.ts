import {OmniType} from '../parse';
import {TypeNode} from './TypeNode.ts';

export interface AstTargetFunctions {

  createTypeNode<const T extends OmniType>(type: T, implementation?: boolean): TypeNode;
}
