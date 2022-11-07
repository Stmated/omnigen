import {AbstractStNode} from '../ast';

export interface Renderer {
  render(node: AbstractStNode): string;
}
