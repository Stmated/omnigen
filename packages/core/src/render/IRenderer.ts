import {IAstNode} from '../ast';

export interface IRenderer {
  render(node: IAstNode): string;
}
