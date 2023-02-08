import {AstNode} from '../ast';
import {AstVisitor} from './AstVisitor';
import {VisitResult} from './VisitResult';

export type VisitFn<N extends AstNode, R, V extends AstVisitor<R>> = (node: N, visitor: V) => VisitResult<R>;
