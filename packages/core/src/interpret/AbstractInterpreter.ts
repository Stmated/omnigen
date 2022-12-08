import {OmniModel} from '../parse/index.js';
import {AstRootNode} from '../ast/index.js';
import {ExternalSyntaxTree, AstTransformer, AstTransformerArguments} from '../transform/index.js';
import {RealOptions} from '../options/index.js';
import {TargetOptions, Interpreter, TargetFeatures} from '../interpret/index.js';

export abstract class AbstractInterpreter<TOpt extends TargetOptions> implements Interpreter<TOpt> {
  private readonly _transformers: AstTransformer<AstRootNode, TOpt>[] = [];

  protected getTransformers(): AstTransformer<AstRootNode, TOpt>[] {
    return this._transformers;
  }

  protected registerTransformer(transformer: AstTransformer<AstRootNode, TOpt>): void {
    this._transformers.push(transformer);
  }

  abstract newRootNode(): Promise<AstRootNode>;

  public async buildSyntaxTree(
    model: OmniModel,
    externals: ExternalSyntaxTree<AstRootNode, TOpt>[],
    options: RealOptions<TOpt>,
    features: TargetFeatures,
  ): Promise<AstRootNode> {

    const rootNode = await this.newRootNode();

    const args: AstTransformerArguments<AstRootNode, TOpt> = {
      model,
      root: rootNode,
      externals,
      options,
      features,
    };

    for (const transformer of this.getTransformers()) {

      // We do the transformers in order.
      // Later we might batch them together based on "type" or "group" or whatever.
      await transformer.transformAst(args);
    }

    return Promise.resolve(rootNode);
  }
}
