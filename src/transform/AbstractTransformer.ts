import {ITransformer} from './ITransformer';
import {ICstVisitor} from '@visit';
import {CstRootNode} from '@cst/CstRootNode';
import {OmniModel} from '@parse';
import {IOptions} from '@options';

export abstract class AbstractTransformer<TRoot extends CstRootNode, TOptions extends IOptions>
  implements ITransformer<TRoot, TOptions> {
  abstract transform(model: OmniModel, root: TRoot, options: TOptions): Promise<void>;
}
