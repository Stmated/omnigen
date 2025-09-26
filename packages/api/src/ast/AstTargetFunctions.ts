import {OmniType} from '../parse';
import {TypeNode} from './TypeNode';

export interface AstTargetFunctions {

  createTypeNode<const T extends OmniType>(type: T, implementation?: boolean, immutable?: boolean): TypeNode;
}
