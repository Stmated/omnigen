import {IExternalSyntaxTree, ITransformer} from '../transform';
import {AstRootNode} from '../ast';
import {IOmniModel} from '../parse';
import {RealOptions} from '../options';
import {ITargetOptions} from '../interpret';

export abstract class AbstractAstTransformer<TRoot extends AstRootNode, TOpt extends ITargetOptions>
implements ITransformer<TRoot, TOpt> {

  /**
   * TODO: Remove "options" and instead use "options" given from model. Or think of some other way of doing it
   */
  abstract transformAst(
    model: IOmniModel,
    root: TRoot,
    externals: IExternalSyntaxTree<TRoot, TOpt>[],
    options: RealOptions<TOpt>
  ): Promise<void>;
}
