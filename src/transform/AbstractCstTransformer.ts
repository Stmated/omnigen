import {ExternalSyntaxTree, ITransformer} from './ITransformer';
import {CstRootNode} from '@cst/CstRootNode';
import {OmniModel} from '@parse';
import {RealOptions} from '@options';
import {ITargetOptions} from '@interpret';

export abstract class AbstractCstTransformer<TRoot extends CstRootNode, TOpt extends ITargetOptions>
  implements ITransformer<TRoot, TOpt> {

  /**
   * TODO: Remove "options" and instead use "options" given from model. Or think of some other way of doing it
   */
  abstract transformCst(
    model: OmniModel,
    root: TRoot,
    externals: ExternalSyntaxTree<TRoot, TOpt>[],
    options: RealOptions<TOpt>
  ): Promise<void>;
}
