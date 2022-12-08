import {OmniModel} from '../parse/index.js';
import {AstRootNode} from '../ast/index.js';
import {Options, RealOptions} from '../options/index.js';
import {TargetFeatures} from '../interpret/index.js';

export interface ExternalSyntaxTree<TRoot extends AstRootNode, TOpt extends Options> {
  node: TRoot;
  options: RealOptions<TOpt>;
}

export interface AstTransformerArguments<TRoot extends AstRootNode, TOpt extends Options> {
  model: OmniModel;
  root: TRoot;
  externals: ExternalSyntaxTree<TRoot, TOpt>[];
  options: RealOptions<TOpt>;
  features: TargetFeatures;
}

export interface AstTransformer<TRoot extends AstRootNode, TOpt extends Options> {
  transformAst(args: AstTransformerArguments<TRoot, TOpt>): Promise<void>;
}
