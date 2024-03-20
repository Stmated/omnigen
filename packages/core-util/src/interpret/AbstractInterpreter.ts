import {AstNode, OmniModel} from '@omnigen/core';
import {ExternalSyntaxTree, AstTransformer, AstTransformerArguments} from '@omnigen/core';
import {TargetOptions, Interpreter, TargetFeatures} from '@omnigen/core';

export abstract class AbstractInterpreter<TOpt extends TargetOptions> implements Interpreter<TOpt> {

  protected readonly options: TOpt;
  protected readonly features: TargetFeatures;

  constructor(options: TOpt, features: TargetFeatures) {
    this.options = options;
    this.features = features;
  }

  protected abstract getTransformers(options: TOpt): IterableIterator<AstTransformer<AstNode, TOpt>>;

  abstract newRootNode(): AstNode;

  public buildSyntaxTree(
    model: OmniModel,
    externals: ExternalSyntaxTree<AstNode, TOpt>[],
  ): AstNode {

    const rootNode = this.newRootNode();

    const args: AstTransformerArguments<AstNode, TOpt> = {
      model,
      root: rootNode,
      externals,
      options: this.options,
      features: this.features,
    };

    for (const transformer of this.getTransformers(this.options)) {

      // We do the transformers in order.
      // Later we might batch them together based on "type" or "group" or whatever.
      transformer.transformAst(args);
    }

    return args.root;
  }
}
