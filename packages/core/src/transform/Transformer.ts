import {OmniModel} from '../parse/index.js';
import {AstRootNode} from '../ast/index.js';
import {TargetOptions} from '../interpret/index.js';
import {RealOptions} from '../options/index.js';

export interface ExternalSyntaxTree<TRoot extends AstRootNode, TOpt extends TargetOptions> {
  node: TRoot;
  options: RealOptions<TOpt>;
}

export interface Transformer<TRoot extends AstRootNode, TOpt extends TargetOptions> {
  transformAst(model: OmniModel, root: TRoot, externals: ExternalSyntaxTree<TRoot, TOpt>[], options: RealOptions<TOpt>): Promise<void>;
}
