import {AbstractInterpreter} from '@interpret/AbstractInterpreter';
import {JavaCstRootNode, IJavaOptions} from '@java';
import {CstRootNode} from '@cst/CstRootNode';
import {BaseJavaCstTransformer} from '@java/transform';
import {AddConstructorJavaCstTransformer} from '@java/transform/AddConstructorJavaCstTransformer';
import {PackageImportJavaCstTransformer} from '@java/transform/PackageImportJavaCstTransformer';
import {AdditionalPropertiesInterfaceTransformer} from '@java/transform/AdditionalPropertiesInterfaceTransformer';

export class JavaInterpreter extends AbstractInterpreter<IJavaOptions> {
  constructor() {
    super();
    this.registerTransformer(new BaseJavaCstTransformer());
    this.registerTransformer(new AddConstructorJavaCstTransformer());
    this.registerTransformer(new AdditionalPropertiesInterfaceTransformer());
    this.registerTransformer(new PackageImportJavaCstTransformer());
  }

  newRootNode(): Promise<CstRootNode> {
    return Promise.resolve(new JavaCstRootNode());
  }
}
