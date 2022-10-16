import {ExternalSyntaxTree, Transformer} from '../transform';
import {AstRootNode} from '../ast';
import {OmniModel} from '../parse';
import {RealOptions} from '../options';
import {TargetOptions} from '../interpret';

export abstract class AbstractAstTransformer<TRoot extends AstRootNode, TOpt extends TargetOptions>
implements Transformer<TRoot, TOpt> {

  /**
   * TODO: Remove "options" and instead use "options" given from model. Or think of some other way of doing it
   */
  abstract transformAst(
    model: OmniModel,
    root: TRoot,
    externals: ExternalSyntaxTree<TRoot, TOpt>[],
    options: RealOptions<TOpt>
  ): Promise<void>;
}
