import {AstNode, AstTransformer, AstTransformerArguments, ExternalSyntaxTree, Interpreter, OmniModel, RootAstNode, TargetFeatures, TargetOptions} from '@omnigen/core';
import {ReferenceNodeNotFoundError} from '../ast';

export abstract class AbstractInterpreter<TOpt extends TargetOptions> implements Interpreter<TOpt> {

  protected readonly options: TOpt;
  protected readonly features: TargetFeatures;

  constructor(options: TOpt, features: TargetFeatures) {
    this.options = options;
    this.features = features;
  }

  protected abstract getTransformers(options: TOpt): IterableIterator<AstTransformer<RootAstNode, TOpt>>;

  abstract newRootNode(): RootAstNode;

  public buildSyntaxTree(
    model: OmniModel,
    externals: ExternalSyntaxTree<RootAstNode, TOpt>[],
  ): AstNode {

    const rootNode = this.newRootNode();

    const args: AstTransformerArguments<RootAstNode, TOpt> = {
      model,
      root: rootNode,
      externals,
      options: this.options,
      features: this.features,
    };

    // const previousRoots: {transformer: any, root: RootAstNode}[] = [];

    for (const transformer of this.getTransformers(this.options)) {

      // We do the transformers in order.
      // Later we might batch them together based on "type" or "group" or whatever.
      try {
        // previousRoots.push({transformer: transformer, root: args.root});
        transformer.transformAst(args);
      } catch (error) {
        if (error instanceof ReferenceNodeNotFoundError) {

          // for (let i = previousRoots.length - 1; i >= 0; i--) {
          //
          //   const refNode = new EmulatedReference(error.targetId);
          //   try {
          //
          //     const previous = args.root.resolveNodeRef(refNode);
          //     throw new Error(`Found missing node as ${previous}`, {cause: error});
          //
          //   } catch (ignored) {
          //     // Ignored, we will keep trying until we find one, or fallback on original error.
          //   }
          // }

          throw error;

        } else {
          throw new Error(`Error when running ${transformer}: ${error}`, {cause: error});
        }
      }
    }

    return args.root;
  }
}

// class EmulatedReference implements Reference<AstNode> {
//   readonly id = -1;
//   readonly targetId: number;
//
//   constructor(targetId: number) {
//     this.targetId = targetId;
//   }
//
//   resolve(root: RootAstNode): AstNode {
//     return root.resolveNodeRef(this);
//   }
//
//   setId(id: number): this {
//     throw new Error(`Emulated`);
//   }
//
//   withIdFrom(node: AstNode): this {
//     throw new Error(`Emulated`);
//   }
//
//   visit<R>(visitor: AstVisitor<R>): VisitResult<R> {
//     throw new Error(`Emulated`);
//   }
//
//   reduce(reducer: Reducer<AstVisitor<unknown>>): ReducerResult<AstNode> {
//     throw new Error(`Emulated`);
//   }
// }
