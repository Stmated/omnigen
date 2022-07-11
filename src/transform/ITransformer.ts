import {OmniModel} from '@parse';
import {ICstVisitor} from '@visit';
import {CstRootNode} from '@cst/CstRootNode';
import {IOptions} from '@options';

export interface ITransformer<TRoot extends CstRootNode, TOptions extends IOptions> {
  transform(model: OmniModel, root: TRoot, options: TOptions): Promise<void>;
}
