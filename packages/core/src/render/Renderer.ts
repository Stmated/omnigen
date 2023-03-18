import {AstNode} from '../ast/index.js';

export interface Renderer {
  render(node: AstNode): string;
}
