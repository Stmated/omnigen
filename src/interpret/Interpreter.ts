import {OmniModel} from '@parse';
import {AstRootNode} from '@ast/AstRootNode';
import {RealOptions} from '@options';
import {ITargetOptions} from '@interpret/ITargetOptions';
import {ExternalSyntaxTree} from '@transform';

export interface Interpreter<TOpt extends ITargetOptions> {
  buildSyntaxTree(model: OmniModel, externals: ExternalSyntaxTree<AstRootNode, TOpt>[], options: RealOptions<TOpt>): Promise<AstRootNode>;
}

