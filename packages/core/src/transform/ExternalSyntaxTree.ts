import {AstNode} from '../ast';
import {Options, RealOptions} from '../options';

export interface ExternalSyntaxTree<TRoot extends AstNode, TOpt extends Options> {
  node: TRoot;
  options: RealOptions<TOpt>;
}
