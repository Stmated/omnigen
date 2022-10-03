import {Interpreter, ITargetOptions} from '@interpret';
import {OmniModel} from '@parse';
import {CstRootNode} from '@cst/CstRootNode';
import {ExternalSyntaxTree, ITransformer} from '@transform';
import {RealOptions} from '@options';

export abstract class AbstractInterpreter<TOpt extends ITargetOptions> implements Interpreter<TOpt> {
  private readonly _transformers: ITransformer<CstRootNode, TOpt>[] = [];

  protected getTransformers(): ITransformer<CstRootNode, TOpt>[] {
    return this._transformers;
  }

  protected registerTransformer(transformer: ITransformer<CstRootNode, TOpt>): void {
    this._transformers.push(transformer);
  }

  abstract newRootNode(): Promise<CstRootNode>;

  public async buildSyntaxTree(
    model: OmniModel,
    externals: ExternalSyntaxTree<CstRootNode, TOpt>[],
    options: RealOptions<TOpt>
  ): Promise<CstRootNode> {
    
    const rootNode = await this.newRootNode();

    for (const transformer of this.getTransformers()) {

      // We do the transformers in order.
      // Later we might batch them together based on "type" or "group" or whatever.
      await transformer.transformCst(model, rootNode, externals, options);
    }

    return Promise.resolve(rootNode);
  }
}
