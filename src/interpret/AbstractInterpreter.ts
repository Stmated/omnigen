import {Interpreter} from '@interpret';
import {GenericModel} from '@parse';
import {ICstVisitor} from '@visit';
import {ICstNode} from '@cst';
import {CstRootNode} from '@cst/CstRootNode';

export abstract class AbstractInterpreter<TVisitor extends ICstVisitor, TNode extends ICstNode<TVisitor>> implements Interpreter<TVisitor, TNode> {
  abstract interpret(model: GenericModel): CstRootNode<TVisitor>;
}
