import {AstNode} from '../ast';
import {Options} from '../options';

export interface ExternalSyntaxTree<TRoot extends AstNode, TOpt extends Options> {
  node: TRoot;
  options: TOpt;
}
