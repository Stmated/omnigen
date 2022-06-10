import {ITransformer} from './ITransformer';
import {ICstVisitor} from '@visit';
import {CstRootNode} from '@cst/CstRootNode';
import {GenericModel} from '@parse';
import {IOptions} from '@options';

export abstract class AbstractTransformer<TVisitor extends ICstVisitor, TRoot extends CstRootNode<TVisitor>, TOptions extends IOptions>
  implements ITransformer<TVisitor, TRoot, TOptions> {
  abstract transform(model: GenericModel, root: TRoot, options: TOptions): Promise<void>;
}
