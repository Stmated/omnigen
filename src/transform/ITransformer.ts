import {OmniModel} from '@parse';
import {CstRootNode} from '@cst/CstRootNode';
import {ITargetOptions} from '@interpret';
import {RealOptions} from '@options';

export interface ExternalSyntaxTree<TRoot extends CstRootNode, TOpt extends ITargetOptions> {
  node: TRoot;
  options: RealOptions<TOpt>;
}

export interface ITransformer<TRoot extends CstRootNode, TOpt extends ITargetOptions> {
  transformCst(model: OmniModel, root: TRoot, externals: ExternalSyntaxTree<TRoot, TOpt>[], options: TOpt): Promise<void>;
}
