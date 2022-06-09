import {GenericModel} from '@parse';
import {ICstNode} from '@cst';
import {ICstVisitor} from '@visit';
import {CstRootNode} from '@cst/CstRootNode';

export interface Interpreter<TVisitor extends ICstVisitor, TNode extends ICstNode<TVisitor>> {
  interpret(model: GenericModel): CstRootNode<TVisitor>;
}
