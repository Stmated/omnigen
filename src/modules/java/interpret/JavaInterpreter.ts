import {AbstractInterpreter} from '@interpret/AbstractInterpreter';
import {JavaCstRootNode, JavaOptions} from '@java';
import {CstRootNode} from '@cst/CstRootNode';
import {BaseJavaCstTransformer} from '@java/transform';
import {AddConstructorJavaCstTransformer} from '@java/transform/AddConstructorJavaCstTransformer';
import {IJavaCstVisitor} from '@java/visit/IJavaCstVisitor';
import {PackageImportJavaCstTransformer} from '@java/transform/PackageImportJavaCstTransformer';

export class JavaInterpreter extends AbstractInterpreter<JavaOptions> {
  constructor() {
    super();
    this.registerTransformer(new BaseJavaCstTransformer());
    this.registerTransformer(new AddConstructorJavaCstTransformer());
    this.registerTransformer(new PackageImportJavaCstTransformer());
  }

  newRootNode(): Promise<CstRootNode> {
    return Promise.resolve(new JavaCstRootNode());
  }
}
