import {IRenderer} from '../render';
import {AstRootNode} from '../ast';

export abstract class AbstractRenderer implements IRenderer {
  abstract render(node: AstRootNode): string;
}
