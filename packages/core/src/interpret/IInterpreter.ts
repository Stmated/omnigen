import {IOmniModel} from '../parse';
import {AstRootNode} from '../ast';
import {RealOptions} from '../options';
import {ITargetOptions} from '../interpret';
import {IExternalSyntaxTree} from '../transform';

export interface IInterpreter<TOpt extends ITargetOptions> {
  buildSyntaxTree(model: IOmniModel, externals: IExternalSyntaxTree<AstRootNode, TOpt>[], options: RealOptions<TOpt>): Promise<AstRootNode>;
}

