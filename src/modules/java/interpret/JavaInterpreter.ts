import {AbstractInterpreter} from '@interpret/AbstractInterpreter';
import {JavaCstRootNode, JavaOptions} from '@java';
import {CstRootNode} from '@cst/CstRootNode';
import {JavaBaseTransformer} from '@java/transform';
import {AddConstructorTransformer} from '@java/transform/AddConstructorTransformer';
import {IJavaCstVisitor} from '@java/visit/IJavaCstVisitor';
import {PackageImportTransformer} from '@java/transform/PackageImportTransformer';

export class JavaInterpreter extends AbstractInterpreter<IJavaCstVisitor<void>, JavaOptions> {
  constructor() {
    super();
    this.registerTransformer(new JavaBaseTransformer());
    this.registerTransformer(new AddConstructorTransformer());
    this.registerTransformer(new PackageImportTransformer());
  }

  newRootNode(): Promise<CstRootNode> {
    return Promise.resolve(new JavaCstRootNode());
  }
}
