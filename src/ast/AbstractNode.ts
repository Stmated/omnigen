import {IAstVisitor, VisitResult} from '@visit';
import {IAstNode} from './IAstNode';

export default abstract class AbstractNode implements IAstNode {
  abstract visit<R>(visitor: IAstVisitor<R>): VisitResult<R>;
}
