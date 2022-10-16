import {AstVisitor, VisitResult} from '../visit';
import {AstNode} from './AstNode';

export abstract class AbstractNode implements AstNode {
  abstract visit<R>(visitor: AstVisitor<R>): VisitResult<R>;
}
