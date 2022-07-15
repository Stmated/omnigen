import {ITransformer} from './ITransformer';
import {CstRootNode} from '@cst/CstRootNode';
import {OmniModel} from '@parse';
import {IOptions} from '@options';

export abstract class AbstractCstTransformer<TRoot extends CstRootNode, TOptions extends IOptions>
  implements ITransformer<TRoot, TOptions> {
  abstract transformCst(model: OmniModel, root: TRoot, options: TOptions): Promise<void>;
}
