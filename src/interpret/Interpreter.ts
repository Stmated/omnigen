import {OmniModel} from '@parse';
import {CstRootNode} from '@cst/CstRootNode';
import {RealOptions} from '@options';
import {ITargetOptions} from '@interpret/ITargetOptions';
import {ExternalSyntaxTree} from '@transform';

export interface Interpreter<TOpt extends ITargetOptions> {
  buildSyntaxTree(model: OmniModel, externals: ExternalSyntaxTree<CstRootNode, TOpt>[], options: RealOptions<TOpt>): Promise<CstRootNode>;
}

