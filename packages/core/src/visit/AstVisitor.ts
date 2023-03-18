import {AstNode, AstNodeWithChildren} from '../ast/index.js';
import {VisitFn} from './VisitFn';

export interface AstVisitor<R> {
  visitRootNode: VisitFn<AstNodeWithChildren<AstNode>, R, AstVisitor<R>>;
}

