import {OmniModel} from '../parse/index.js';
import {AstRootNode} from '../ast/index.js';
import {RealOptions} from '../options/index.js';
import {TargetOptions} from '../interpret/index.js';
import {ExternalSyntaxTree} from '../transform/index.js';

export interface Interpreter<TOpt extends TargetOptions> {
  buildSyntaxTree(model: OmniModel, externals: ExternalSyntaxTree<AstRootNode, TOpt>[], options: RealOptions<TOpt>): Promise<AstRootNode>;
}

