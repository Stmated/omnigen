import {OmniModel} from '../parse/index.js';
import {AstRootNode} from '../ast/index.js';
import {ExternalSyntaxTree, Transformer} from '../transform/index.js';
import {RealOptions} from '../options/index.js';
import {TargetOptions, Interpreter} from '../interpret/index.js';

export abstract class AbstractInterpreter<TOpt extends TargetOptions> implements Interpreter<TOpt> {
  private readonly _transformers: Transformer<AstRootNode, TOpt>[] = [];

  protected getTransformers(): Transformer<AstRootNode, TOpt>[] {
    return this._transformers;
  }

  protected registerTransformer(transformer: Transformer<AstRootNode, TOpt>): void {
    this._transformers.push(transformer);
  }

  abstract newRootNode(): Promise<AstRootNode>;

  public async buildSyntaxTree(
    model: OmniModel,
    externals: ExternalSyntaxTree<AstRootNode, TOpt>[],
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
