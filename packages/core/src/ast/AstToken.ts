import {AstVisitor, VisitResult} from '../visit/index.js';

export interface AstToken {
  visit<R>(visitor: AstVisitor<R>): VisitResult<R>;
}
