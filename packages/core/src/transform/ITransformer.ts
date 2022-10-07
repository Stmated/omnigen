import {OmniModel} from '../parse';
import {AstRootNode} from '../ast';
import {ITargetOptions} from '../interpret';
import {RealOptions} from '../options';

export interface ExternalSyntaxTree<TRoot extends AstRootNode, TOpt extends ITargetOptions> {
  node: TRoot;
  options: RealOptions<TOpt>;
}

export interface ITransformer<TRoot extends AstRootNode, TOpt extends ITargetOptions> {
  transformAst(model: OmniModel, root: TRoot, externals: ExternalSyntaxTree<TRoot, TOpt>[], options: RealOptions<TOpt>): Promise<void>;
}
