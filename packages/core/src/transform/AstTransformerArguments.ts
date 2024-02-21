import {AstNode} from '../ast/index.js';
import {Options} from '../options/index.js';
import {OmniModel} from '../parse/index.js';
import {TargetFeatures} from '../interpret';
import {ExternalSyntaxTree} from './ExternalSyntaxTree';

export interface AstTransformerArguments<TRoot extends AstNode, TOpt extends Options> {
  model: OmniModel;
  root: TRoot;
  externals: ExternalSyntaxTree<TRoot, TOpt>[];
  options: TOpt;
  features: TargetFeatures;
}
