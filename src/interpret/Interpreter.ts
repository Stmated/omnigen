import {GenericModel} from '@parse';
import {ICstVisitor} from '@visit';
import {CstRootNode} from '@cst/CstRootNode';
import {IOptions} from '@options';

export interface Interpreter<TVisitor extends ICstVisitor, TOptions extends IOptions> {
  interpret(model: GenericModel, options: TOptions): Promise<CstRootNode<TVisitor>>;
}
