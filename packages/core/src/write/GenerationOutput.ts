import {AbstractStNode} from '../ast/index.js';

export interface GenerationOutput {

  /**
   * Should maybe be an interface that unites different targets' compilation unit root nodes
   */
  compilationUnit: AbstractStNode;
  relativeFilePath: string;
  fileContent: string;
}
