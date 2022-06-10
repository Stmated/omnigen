import {AbstractInterpreter} from '@interpret/AbstractInterpreter';
import {JavaCstVisitor, JavaCstRootNode, JavaOptions} from '@java';
import {CstRootNode} from '@cst/CstRootNode';
import {JavaBaseTransformer} from '@java/transform';

export class JavaInterpreter extends AbstractInterpreter<JavaCstVisitor<void>, JavaOptions> {
  constructor() {
    super();
    this.registerTransformer(new JavaBaseTransformer());
  }

  newRootNode(): Promise<CstRootNode> {
    return Promise.resolve(new JavaCstRootNode());
  }
}
