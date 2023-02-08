import {AstNode, OmniModel} from '@omnigen/core';
import {ExternalSyntaxTree, AstTransformer, AstTransformerArguments} from '@omnigen/core';
import {RealOptions} from '@omnigen/core';
import {TargetOptions, Interpreter, TargetFeatures} from '@omnigen/core';

export abstract class AbstractInterpreter<TOpt extends TargetOptions> implements Interpreter<TOpt> {
  private readonly _transformers: AstTransformer<AstNode, TOpt>[] = [];

  protected getTransformers(): AstTransformer<AstNode, TOpt>[] {
    return this._transformers;
  }

  protected registerTransformer(transformer: AstTransformer<AstNode, TOpt>): void {
    this._transformers.push(transformer);
  }

  abstract newRootNode(): Promise<AstNode>;

  public async buildSyntaxTree(
    model: OmniModel,
    externals: ExternalSyntaxTree<AstNode, TOpt>[],
    options: RealOptions<TOpt>,
    features: TargetFeatures,
  ): Promise<AstNode> {

    const rootNode = await this.newRootNode();

    const args: AstTransformerArguments<AstNode, TOpt> = {
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
