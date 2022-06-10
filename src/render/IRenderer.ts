import {ICstNode} from '@cst';

export interface IRenderer {
  render(node: ICstNode): string;
}
