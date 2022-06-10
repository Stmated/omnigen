import {ICstVisitor, VisitResult} from '@visit';
import {ICstNode} from './ICstNode';

export default abstract class AbstractNode implements ICstNode {
  abstract visit<R>(visitor: ICstVisitor<R>): VisitResult<R>;
}
