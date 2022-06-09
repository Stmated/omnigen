import {ICstVisitor} from '../visit/ICstVisitor';
import {ICstNode} from './ICstNode';

export default abstract class AbstractNode<TVisitor extends ICstVisitor> implements ICstNode<TVisitor> {
  abstract visit(visitor: TVisitor): void;
}
