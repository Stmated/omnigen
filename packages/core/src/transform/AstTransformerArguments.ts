import {AstNode} from '../ast';
import {Options, RealOptions} from '../options';
import {OmniModel} from '../parse';
import {TargetFeatures} from '../interpret';
import {ExternalSyntaxTree} from './ExternalSyntaxTree';

export interface AstTransformerArguments<TRoot extends AstNode, TOpt extends Options> {
  model: OmniModel;
  root: TRoot;
  externals: ExternalSyntaxTree<TRoot, TOpt>[];
  options: RealOptions<TOpt>;
  features: TargetFeatures;
}
