import {AstNode, AstNodeWithChildren, AstVisitor, VisitResult} from '@omnigen/core';

export class JavaAstRootNode implements AstNode, AstNodeWithChildren<AstNode> {

  children: AstNode[] = [];

  visit<R>(visitor: AstVisitor<R>): VisitResult<R> {
    return visitor.visitRootNode(this, visitor);
  }
}
