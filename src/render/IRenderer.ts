import {IAstNode} from '../ast';
import {IAstVisitor} from '@visit';

export interface IRenderer {
  render(node: IAstNode): string;
}
