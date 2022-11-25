import {AbstractStNode} from './AbstractStNode.js';

export interface RenderedCompilationUnit {
  name: string;
  fileName: string;
  content: string;
  directories: string[];
  node: AbstractStNode;
}
