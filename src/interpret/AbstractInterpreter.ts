import {Interpreter} from '@interpret';
import {GenericModel} from '@parse';
import {ICstVisitor} from '@visit';
import {CstRootNode} from '@cst/CstRootNode';
import {ITransformer} from '@transform';
import {IOptions} from '@options';

export abstract class AbstractInterpreter<TVisitor extends ICstVisitor<void>, TOptions extends IOptions> implements Interpreter<TVisitor, TOptions> {
  private readonly _transformers: ITransformer<TVisitor, CstRootNode, TOptions>[] = [];

  protected getTransformers(): ITransformer<TVisitor, CstRootNode, TOptions>[] {
    return this._transformers;
  }

  protected registerTransformer(transformer: ITransformer<TVisitor, CstRootNode, TOptions>): void {
    this._transformers.push(transformer);
  }

  abstract newRootNode(): Promise<CstRootNode>;

  public async interpret(model: GenericModel, options: TOptions): Promise<CstRootNode> {
    const rootNode = await this.newRootNode();

    for (const transformer of this.getTransformers()) {

      // We do the transformers in order.
      // Later we might batch them together based on "type" or "group" or whatever.
      await transformer.transform(model, rootNode, options);
    }

    return Promise.resolve(rootNode);
  }
}
