import {AstVisitor, VisitResult} from '../visit/index.js';

export abstract class AbstractToken {
  abstract visit<R>(visitor: AstVisitor<R>): VisitResult<R>;
}
