import {GenericModel} from '@parse';
import {ICstVisitor} from '@visit';
import {CstRootNode} from '@cst/CstRootNode';
import {IOptions} from '../options/IOptions';

export interface ITransformer<TVisitor extends ICstVisitor, TRoot extends CstRootNode<TVisitor>, TOptions extends IOptions> {
  transform(model: GenericModel, root: TRoot, options: TOptions): void;
}
