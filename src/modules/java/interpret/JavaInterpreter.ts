import {AbstractInterpreter} from '@interpret/AbstractInterpreter';
import {JavaCstVisitor, JavaCstRootNode, JavaOptions} from '@java';
import {CstRootNode} from '@cst/CstRootNode';
import {JavaBaseTransformer} from '@java/transform';
import {AddConstructorTransformer} from '@java/transform/AddConstructorTransformer';
import {JavaVisitor} from '@java/visit/JavaVisitor';
import {IJavaCstVisitor} from '@java/visit/IJavaCstVisitor';

export class JavaInterpreter extends AbstractInterpreter<IJavaCstVisitor<void>, JavaOptions> {
  constructor() {
    super();
    this.registerTransformer(new JavaBaseTransformer());
    this.registerTransformer(new AddConstructorTransformer());
  }

  newRootNode(): Promise<CstRootNode> {
    return Promise.resolve(new JavaCstRootNode());
  }
}
