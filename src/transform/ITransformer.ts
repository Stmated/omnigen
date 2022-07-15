import {OmniModel} from '@parse';
import {CstRootNode} from '@cst/CstRootNode';
import {IOptions} from '@options';

export interface ITransformer<TRoot extends CstRootNode, TOptions extends IOptions> {
  transformCst(model: OmniModel, root: TRoot, options: TOptions): Promise<void>;
}
