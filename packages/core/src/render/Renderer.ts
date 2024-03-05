import {AstNode, RenderedCompilationUnit} from '../ast/index.ts';
import {AstVisitor} from '../visit';

export interface Renderer {
  executeRender<R>(node: AstNode, visitor: AstVisitor<R>): RenderedCompilationUnit[];
}
