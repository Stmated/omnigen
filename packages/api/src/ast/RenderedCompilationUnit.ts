import {AstNode} from './AstNode';

export interface RenderedCompilationUnit {
  name: string;
  fileName: string;
  content: string;
  directories: string[];
  node: AstNode;
}
