import {OmniModel} from '../parse';
import {AstRootNode} from '../ast';
import {RealOptions} from '../options';
import {TargetOptions} from '../interpret';
import {ExternalSyntaxTree} from '../transform';

export interface Interpreter<TOpt extends TargetOptions> {
  buildSyntaxTree(model: OmniModel, externals: ExternalSyntaxTree<AstRootNode, TOpt>[], options: RealOptions<TOpt>): Promise<AstRootNode>;
}

