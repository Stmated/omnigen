import {AstNode} from '../ast';

export interface Renderer {
  render(node: AstNode): string;
}
