import {AstNode, AstNodeWithChildren} from '../ast';
import {VisitFn} from './VisitFn';

export interface AstVisitor<R> {
  visitRootNode: VisitFn<AstNodeWithChildren<AstNode>, R, AstVisitor<R>>;
}

