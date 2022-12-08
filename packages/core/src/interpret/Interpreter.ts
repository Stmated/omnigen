import {OmniModel} from '../parse/index.js';
import {AstRootNode} from '../ast/index.js';
import {RealOptions} from '../options/index.js';
import {TargetFeatures, TargetOptions} from '../interpret/index.js';
import {ExternalSyntaxTree} from '../transform/index.js';

export interface Interpreter<TOpt extends TargetOptions> {
  buildSyntaxTree(
    model: OmniModel,
    externals: ExternalSyntaxTree<AstRootNode, TOpt>[],
    options: RealOptions<TOpt>,
    features: TargetFeatures,
  ): Promise<AstRootNode>;
}

