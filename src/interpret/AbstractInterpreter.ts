import {Interpreter} from '@interpret';
import {OmniModel} from '@parse';
import {ICstVisitor} from '@visit';
import {CstRootNode} from '@cst/CstRootNode';
import {ITransformer} from '@transform';
import {IOptions} from '@options';

export abstract class AbstractInterpreter<TOptions extends IOptions> implements Interpreter<TOptions> {
  private readonly _transformers: ITransformer<CstRootNode, TOptions>[] = [];

  protected getTransformers(): ITransformer<CstRootNode, TOptions>[] {
    return this._transformers;
  }

  protected registerTransformer(transformer: ITransformer<CstRootNode, TOptions>): void {
    this._transformers.push(transformer);
  }

  abstract newRootNode(): Promise<CstRootNode>;

  public async interpret(model: OmniModel, options: TOptions): Promise<CstRootNode> {
    const rootNode = await this.newRootNode();

    for (const transformer of this.getTransformers()) {

      // We do the transformers in order.
      // Later we might batch them together based on "type" or "group" or whatever.
      await transformer.transformCst(model, rootNode, options);
    }

    return Promise.resolve(rootNode);
  }
}
