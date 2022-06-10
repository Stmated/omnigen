import {IRenderer} from '@render';
import {CstRootNode} from '@cst/CstRootNode';

export abstract class AbstractRenderer implements IRenderer {
  abstract render(node: CstRootNode): string;
}
