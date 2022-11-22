import {AbstractStNode} from '../ast/index.js';

export interface Renderer {
  render(node: AbstractStNode): string;
}
