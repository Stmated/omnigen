import {AstNode, RenderedCompilationUnit} from '../ast';
import {AstVisitor} from '../visit';

export interface Renderer {
  executeRender<R>(node: AstNode, visitor: AstVisitor<R>): RenderedCompilationUnit[];
}
