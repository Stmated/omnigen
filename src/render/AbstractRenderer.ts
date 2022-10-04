import {IRenderer} from '@render';
import {AstRootNode} from '../ast/AstRootNode';

export abstract class AbstractRenderer implements IRenderer {
  abstract render(node: AstRootNode): string;
}
