import {OmniModel} from '../parse/index.js';
import {AstNode} from '../ast/index.js';
import {RealOptions} from '../options/index.js';
import {TargetFeatures, TargetOptions} from '../interpret';
import {ExternalSyntaxTree} from '../transform/index.js';

export interface Interpreter<TOpt extends TargetOptions = TargetOptions> {
  buildSyntaxTree(
    model: OmniModel,
    externals: ExternalSyntaxTree<AstNode, TOpt>[],
    options: RealOptions<TOpt>,
    features: TargetFeatures,
  ): Promise<AstNode>;
}

