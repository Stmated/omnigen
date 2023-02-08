import {AstNode} from './AstNode';

export interface AstNodeWithChildren<T extends AstNode> extends AstNode {

  children: T[];
}
