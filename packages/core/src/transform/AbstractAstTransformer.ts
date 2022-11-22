import {ExternalSyntaxTree, Transformer} from '../transform/index.js';
import {AstRootNode} from '../ast/index.js';
import {OmniModel} from '../parse/index.js';
import {RealOptions} from '../options/index.js';
import {TargetOptions} from '../interpret/index.js';

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
