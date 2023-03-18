import {AstNode} from '../ast/index.js';
import {Options, RealOptions} from '../options/index.js';

export interface ExternalSyntaxTree<TRoot extends AstNode, TOpt extends Options> {
  node: TRoot;
  options: RealOptions<TOpt>;
}
