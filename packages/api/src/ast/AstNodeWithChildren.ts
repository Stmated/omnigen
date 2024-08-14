import {AstNode} from './AstNode';

export interface AstNodeWithChildren<T extends AstNode = AstNode> extends AstNode {

  children: Array<T>; // TODO: Make this a ReadOnlyArray
}
