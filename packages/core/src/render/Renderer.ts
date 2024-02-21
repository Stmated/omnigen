import {AstNode, RenderedCompilationUnit} from '../ast';

export interface Renderer {
  executeRender(node: AstNode): RenderedCompilationUnit[];
}
