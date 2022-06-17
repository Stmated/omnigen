import {ICstNode} from '@cst';
import {ICstVisitor} from '@visit';

export interface IRenderer {
  render(node: ICstNode): string;
}
