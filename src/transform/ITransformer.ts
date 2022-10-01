import {OmniModel} from '@parse';
import {CstRootNode} from '@cst/CstRootNode';
import {ITargetOptions} from '@interpret';

export interface ITransformer<TRoot extends CstRootNode, TOptions extends ITargetOptions> {
  transformCst(model: OmniModel, root: TRoot, options: TOptions): Promise<void>;
}
