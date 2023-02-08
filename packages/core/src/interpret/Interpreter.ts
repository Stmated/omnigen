import {OmniModel} from '../parse';
import {AstNode} from '../ast';
import {RealOptions} from '../options';
import {TargetFeatures, TargetOptions} from '../interpret';
import {ExternalSyntaxTree} from '../transform';

export interface Interpreter<TOpt extends TargetOptions> {
  buildSyntaxTree(
    model: OmniModel,
    externals: ExternalSyntaxTree<AstNode, TOpt>[],
    options: RealOptions<TOpt>,
    features: TargetFeatures,
  ): Promise<AstNode>;
}

