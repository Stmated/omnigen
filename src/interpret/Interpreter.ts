import {OmniModel} from '@parse';
import {CstRootNode} from '@cst/CstRootNode';
import {IOptions, PrimitiveGenerificationChoice, RealOptions} from '@options';

export interface ITargetOptions extends IOptions {

}

export interface IGenericTargetOptions extends ITargetOptions {
  onPrimitiveGenerification: PrimitiveGenerificationChoice;
}

export interface Interpreter<TOptions extends ITargetOptions> {
  buildSyntaxTree(model: OmniModel, options: RealOptions<TOptions>): Promise<CstRootNode>;
}
