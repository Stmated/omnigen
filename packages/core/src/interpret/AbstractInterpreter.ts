import {IOmniModel} from '../parse';
import {AstRootNode} from '../ast';
import {IExternalSyntaxTree, ITransformer} from '../transform';
import {RealOptions} from '../options';
import {ITargetOptions, IInterpreter} from '../interpret';

export abstract class AbstractInterpreter<TOpt extends ITargetOptions> implements IInterpreter<TOpt> {
  private readonly _transformers: ITransformer<AstRootNode, TOpt>[] = [];

  protected getTransformers(): ITransformer<AstRootNode, TOpt>[] {
    return this._transformers;
  }

  protected registerTransformer(transformer: ITransformer<AstRootNode, TOpt>): void {
    this._transformers.push(transformer);
  }

  abstract newRootNode(): Promise<AstRootNode>;

  public async buildSyntaxTree(
    model: IOmniModel,
    externals: IExternalSyntaxTree<AstRootNode, TOpt>[],
    options: RealOptions<TOpt>,
  ): Promise<AstRootNode> {

    const rootNode = await this.newRootNode();

    for (const transformer of this.getTransformers()) {

      // We do the transformers in order.
      // Later we might batch them together based on "type" or "group" or whatever.
      await transformer.transformAst(model, rootNode, externals, options);
    }

    return Promise.resolve(rootNode);
  }
}
