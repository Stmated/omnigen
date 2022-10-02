import {OmniModel} from '@parse';
import {CstRootNode} from '@cst/CstRootNode';
import {RealOptions} from '@options';
import {ITargetOptions} from '@interpret/ITargetOptions';

export interface Interpreter<TOptions extends ITargetOptions> {
  buildSyntaxTree(model: OmniModel, options: RealOptions<TOptions>): Promise<CstRootNode>;
}

