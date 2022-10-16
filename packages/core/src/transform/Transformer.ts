import {OmniModel} from '../parse';
import {AstRootNode} from '../ast';
import {TargetOptions} from '../interpret';
import {RealOptions} from '../options';

export interface ExternalSyntaxTree<TRoot extends AstRootNode, TOpt extends TargetOptions> {
  node: TRoot;
  options: RealOptions<TOpt>;
}

export interface Transformer<TRoot extends AstRootNode, TOpt extends TargetOptions> {
  transformAst(model: OmniModel, root: TRoot, externals: ExternalSyntaxTree<TRoot, TOpt>[], options: RealOptions<TOpt>): Promise<void>;
}
