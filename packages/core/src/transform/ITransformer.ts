import {IOmniModel} from '../parse';
import {AstRootNode} from '../ast';
import {ITargetOptions} from '../interpret';
import {RealOptions} from '../options';

export interface IExternalSyntaxTree<TRoot extends AstRootNode, TOpt extends ITargetOptions> {
  node: TRoot;
  options: RealOptions<TOpt>;
}

export interface ITransformer<TRoot extends AstRootNode, TOpt extends ITargetOptions> {
  transformAst(model: IOmniModel, root: TRoot, externals: IExternalSyntaxTree<TRoot, TOpt>[], options: RealOptions<TOpt>): Promise<void>;
}
