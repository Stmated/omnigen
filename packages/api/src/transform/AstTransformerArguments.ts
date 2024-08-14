import {RootAstNode} from '../ast';
import {Options} from '../options';
import {OmniModel} from '../parse';
import {TargetFeatures, TargetOptions} from '../interpret';
import {ExternalSyntaxTree} from './ExternalSyntaxTree';

export interface AstTransformerArguments<TRoot extends RootAstNode = RootAstNode, TOpt extends TargetOptions = TargetOptions> {
  model: OmniModel;
  root: TRoot;
  externals: ExternalSyntaxTree<TRoot, TOpt>[];
  options: TOpt;
  features: TargetFeatures;
}
